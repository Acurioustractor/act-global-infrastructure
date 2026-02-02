const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

/**
 * Generate a 384-dimension embedding using OpenAI text-embedding-3-small.
 * Matches the model/dimensions used by scripts/embed-knowledge.mjs.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
      dimensions: 384,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}
