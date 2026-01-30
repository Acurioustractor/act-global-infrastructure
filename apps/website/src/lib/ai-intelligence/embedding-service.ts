/**
 * ACT Unified Embedding Service
 *
 * Generates embeddings for semantic similarity-based confidence scoring
 * Enhanced with ACT Placemat's batch processing and rate limiting
 *
 * Research findings:
 * - Embedding similarity is 30-40% more accurate than keyword matching
 * - LLMs are often overconfident in self-reported scores
 * - Cosine similarity between extracted and source content is most reliable
 *
 * Sources:
 * - https://www.amazon.science/publications/confidence-scoring-for-llm-generated-sql-in-supply-chain-data-extraction
 * - https://sefiks.com/2025/09/02/from-embeddings-to-confidence-scores-converting-similarity-to-percentages/
 *
 * Enhancements from ACT Placemat:
 * - Batch processing with configurable batch size
 * - Rate limiting (3000 req/min → ~50/sec)
 * - Cost tracking per operation
 * - Health monitoring
 */

import OpenAI from 'openai';

// Rate limiting constants (OpenAI: 3000 requests/min)
const RATE_LIMIT_DELAY_MS = 200; // Safe: ~5 requests/sec in batches
const DEFAULT_BATCH_SIZE = 10;

// Cost tracking
const EMBEDDING_COST_PER_1K_TOKENS = 0.00002; // text-embedding-3-small

// Initialize OpenAI client (will be null if no API key)
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export class EmbeddingService {
  /**
   * Check if OpenAI is configured
   */
  isConfigured(): boolean {
    return openai !== null && !!process.env.OPENAI_API_KEY;
  }

  /**
   * Generate embedding for text using OpenAI text-embedding-3-small
   *
   * Model specs:
   * - 1536 dimensions
   * - Cost: ~$0.00002 per 1K tokens (~$0.20 per 1M tokens)
   * - Max input: 8191 tokens (~32,000 characters)
   *
   * @param text - Text to embed (will be truncated to 8000 chars)
   * @returns 1536-dimensional vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env.local');
    }

    try {
      // Truncate to avoid token limits (conservative: 8000 chars ≈ 2000 tokens)
      const truncatedText = text.substring(0, 8000);

      const response = await openai!.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncatedText,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch (more efficient)
   *
   * @param texts - Array of texts to embed
   * @returns Array of 1536-dimensional vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Truncate all texts
      const truncatedTexts = texts.map(t => t.substring(0, 8000));

      const response = await openai!.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncatedTexts,
        encoding_format: 'float',
      });

      return response.data.map(d => d.embedding);
    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   *
   * Returns value between -1 (opposite) and 1 (identical)
   * Typical knowledge extraction: 0.6-0.95 is good match
   *
   * @param a - First embedding vector
   * @param b - Second embedding vector
   * @returns Similarity score between -1 and 1
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Embedding dimensions don't match: ${a.length} vs ${b.length}`);
    }

    // Dot product
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);

    // Magnitudes
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    // Cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Convert similarity score to confidence percentage using logistic function
   *
   * Research shows logistic regression provides interpretable confidence scores
   * Formula: 1 / (1 + e^(-k(x - x0)))
   *
   * Parameters:
   * - k=10: Steep curve for clear differentiation
   * - x0=0.5: Midpoint at 50% similarity
   *
   * Results:
   * - similarity 0.3 → ~5% confidence
   * - similarity 0.5 → ~50% confidence
   * - similarity 0.7 → ~95% confidence
   * - similarity 0.9 → ~99.99% confidence
   *
   * Source: https://sefiks.com/2025/09/02/from-embeddings-to-confidence-scores-converting-similarity-to-percentages/
   */
  similarityToConfidence(similarity: number): number {
    // Logistic function: 1 / (1 + e^(-k(x - x0)))
    const k = 10; // Steepness
    const x0 = 0.5; // Midpoint

    const confidence = 1 / (1 + Math.exp(-k * (similarity - x0)));

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate confidence score for extracted knowledge
   *
   * Combines:
   * 1. Semantic similarity (via embeddings) - 80% weight
   * 2. Structural signals (keywords, formatting) - 20% weight
   *
   * @param extractedContent - The knowledge content we extracted
   * @param sourceContent - The original source content
   * @param suggestedType - The suggested knowledge type (principle, method, etc.)
   * @returns Confidence score between 0 and 1
   */
  async calculateConfidence(
    extractedContent: string,
    sourceContent: string,
    suggestedType: string
  ): Promise<{ confidence: number; similarity: number; embedding: number[] }> {
    if (!this.isConfigured()) {
      // Fallback to keyword-based scoring if OpenAI not configured
      return {
        confidence: this.keywordBasedConfidence(extractedContent, suggestedType),
        similarity: 0,
        embedding: [],
      };
    }

    try {
      // Generate embeddings for both contents
      const [extractedEmbedding, sourceEmbedding] = await this.generateEmbeddings([
        extractedContent,
        sourceContent,
      ]);

      // Calculate semantic similarity
      const similarity = this.cosineSimilarity(extractedEmbedding, sourceEmbedding);

      // Convert to confidence score
      let confidence = this.similarityToConfidence(similarity);

      // Add structural bonuses (keywords, formatting)
      const structuralBonus = this.calculateStructuralBonus(extractedContent, suggestedType);

      // Weighted combination: 80% semantic, 20% structural
      confidence = confidence * 0.8 + structuralBonus * 0.2;

      // Clamp to [0, 1]
      confidence = Math.max(0, Math.min(1, confidence));

      return {
        confidence,
        similarity,
        embedding: extractedEmbedding,
      };
    } catch (error) {
      console.error('❌ Error calculating confidence:', error);

      // Fallback to keyword-based on error
      return {
        confidence: this.keywordBasedConfidence(extractedContent, suggestedType),
        similarity: 0,
        embedding: [],
      };
    }
  }

  /**
   * Calculate structural bonus based on keywords and formatting
   *
   * Returns score between 0 and 1 based on:
   * - Relevant keywords for the knowledge type
   * - Document structure (headings, lists)
   * - Content length
   */
  private calculateStructuralBonus(content: string, suggestedType: string): number {
    let score = 0;

    // Keyword bonuses by type
    const keywordsByType: Record<string, string[]> = {
      principle: ['value', 'belief', 'why we', 'core', 'fundamental', 'philosophy'],
      method: ['framework', 'approach', 'methodology', 'process', 'system'],
      practice: ['how we', 'regularly', 'typically', 'usually', 'always', 'every'],
      procedure: ['step', 'process', 'how to', 'first', 'then', 'next'],
      guide: ['overview', 'introduction', 'guide', 'tutorial', 'explanation'],
    };

    const keywords = keywordsByType[suggestedType] || [];
    const lowerContent = content.toLowerCase();

    // Count keyword matches (max +30%)
    const keywordMatches = keywords.filter(kw => lowerContent.includes(kw)).length;
    score += Math.min(0.3, keywordMatches * 0.05);

    // Structure bonuses
    const hasHeadings = /^#{1,6}\s/m.test(content); // Markdown headings
    const hasLists = /^[\s]*[-*+]\s/m.test(content) || /^\d+\.\s/m.test(content);
    const hasNumberedSteps = /\b(step\s+\d+|first|second|third)\b/i.test(content);

    if (hasHeadings) score += 0.1;
    if (hasLists) score += 0.1;
    if (hasNumberedSteps && suggestedType === 'procedure') score += 0.2;

    // Length bonus (adequate detail)
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 100) score += 0.1;
    if (wordCount > 300) score += 0.1;
    if (wordCount > 500) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Fallback keyword-based confidence (used when OpenAI not available)
   */
  private keywordBasedConfidence(content: string, suggestedType: string): number {
    const structuralBonus = this.calculateStructuralBonus(content, suggestedType);

    // Base confidence on structural signals only
    // Less accurate than embeddings, but better than nothing
    return structuralBonus * 0.7; // Conservative: max 70% confidence
  }

  /**
   * Get estimated cost for generating embeddings
   *
   * @param textLength - Length of text in characters
   * @returns Estimated cost in USD
   */
  estimateCost(textLength: number): number {
    // Rough estimate: 1 token ≈ 4 characters
    const estimatedTokens = textLength / 4;

    return (estimatedTokens / 1000) * EMBEDDING_COST_PER_1K_TOKENS;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ENHANCED BATCH PROCESSING (from ACT Placemat)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Generate embeddings in batches with rate limiting
   *
   * ACT Placemat enhancement: Batch processing with safety delays
   * Prevents rate limit errors on large datasets
   *
   * @param texts - Array of texts to embed
   * @param batchSize - Number of texts per batch (default: 10)
   * @returns Object with embeddings array and cost info
   */
  async generateEmbeddingsBatch(
    texts: string[],
    batchSize: number = DEFAULT_BATCH_SIZE
  ): Promise<{
    embeddings: number[][];
    totalCost: number;
    tokensUsed: number;
    batchesProcessed: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const embeddings: number[][] = [];
    let totalCost = 0;
    let tokensUsed = 0;

    // Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${texts.length} texts in ${batches.length} batches (${batchSize} per batch)`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const truncatedBatch = batch.map(t => t.substring(0, 8000));

      try {
        const response = await openai!.embeddings.create({
          model: 'text-embedding-3-small',
          input: truncatedBatch,
          encoding_format: 'float',
        });

        embeddings.push(...response.data.map(d => d.embedding));

        // Track usage
        const batchTokens = response.usage?.total_tokens || 0;
        tokensUsed += batchTokens;
        totalCost += (batchTokens / 1000) * EMBEDDING_COST_PER_1K_TOKENS;

        console.log(`   ✓ Batch ${i + 1}/${batches.length}: ${batch.length} embeddings (${batchTokens} tokens, $${((batchTokens / 1000) * EMBEDDING_COST_PER_1K_TOKENS).toFixed(6)})`);

        // Rate limiting: Wait between batches (except last one)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${i + 1}:`, error);
        throw new Error(`Failed on batch ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Batch complete: ${embeddings.length} embeddings, ${tokensUsed} tokens, $${totalCost.toFixed(6)}`);

    return {
      embeddings,
      totalCost,
      tokensUsed,
      batchesProcessed: batches.length
    };
  }

  /**
   * Health check for embedding service
   *
   * ACT Placemat enhancement: Verify service is working with test embedding
   * @returns Health status and latency
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latencyMs: number;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        healthy: false,
        latencyMs: 0,
        error: 'OpenAI API key not configured'
      };
    }

    const startTime = Date.now();

    try {
      // Generate test embedding
      await this.generateEmbedding('health check test');

      const latencyMs = Date.now() - startTime;

      return {
        healthy: true,
        latencyMs
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate total cost for a batch operation
   *
   * @param texts - Texts to be embedded
   * @returns Estimated total cost
   */
  estimateBatchCost(texts: string[]): number {
    const totalLength = texts.reduce((sum, text) => sum + text.length, 0);
    return this.estimateCost(totalLength);
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
