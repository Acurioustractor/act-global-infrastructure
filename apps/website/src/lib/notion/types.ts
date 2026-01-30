/**
 * TypeScript interfaces for Notion integration
 */

export interface NotionProjectMetadata {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: 'active' | 'planning' | 'completed' | 'paused';
  priority: number;
  focusAreas: string[];
  themes: string[];
  partners: string[];
  organizationName: string;
  startDate: string | null;
  endDate: string | null;
  outcomes: string;
  metrics: Record<string, any>;
  timelineEntries: Array<{
    date: string;
    description: string;
    type: string;
  }>;
  connections: string[]; // Related project IDs
  notes: string;
  coverImage?: string;
  lastUpdated: string;
}

export interface ProjectEnrichmentData {
  // From Notion
  notion: NotionProjectMetadata | null;

  // From Empathy Ledger
  storytellers: Array<{
    id: string;
    name: string;
    bio: string;
    profileImage?: string;
    storyCount: number;
  }>;
  stories: Array<{
    id: string;
    title: string;
    excerpt: string;
    storytellerId: string;
    themes: string[];
    createdAt: string;
  }>;
  thematicInsights: {
    primaryThemes: string[];
    emergingThemes: string[];
    storyCountByTheme: Record<string, number>;
    commonPatterns: string[];
  };

  // From Blog Posts
  relatedBlogPosts: Array<{
    slug: string;
    title: string;
    excerpt: string;
    relevanceScore: number;
    publishedAt: string;
  }>;

  // From Project Analysis
  relatedProjects: Array<{
    slug: string;
    title: string;
    connectionType: 'direct' | 'thematic' | 'community' | 'geographic' | 'temporal';
    relevanceScore: number;
    reason: string;
  }>;

  // From Media Storage
  media: {
    photos: Array<{
      url: string;
      caption: string;
      source: string;
      verified: boolean;
      tags?: string[];
    }>;
    videos: Array<{
      url: string;
      title: string;
      duration: number;
      source: string;
      thumbnail?: string;
    }>;
  };

  // Enrichment Metadata
  lastEnriched: string;
  enrichmentVersion: string;
  verificationStatus: {
    lcaaContent: 'draft' | 'needs_review' | 'approved';
    communityVoices: 'draft' | 'needs_review' | 'approved';
    blogLinks: 'draft' | 'needs_review' | 'approved';
    mediaGalleries: 'draft' | 'needs_review' | 'approved';
  };
  sources: {
    notion?: {
      database_id: string;
      page_id: string;
      last_synced: string;
    };
    empathyLedger?: {
      storytellerCount: number;
      storyCount: number;
      last_synced: string;
    };
    blogPosts?: {
      linkedCount: number;
      last_scanned: string;
    };
  };
}

export interface EnrichmentDiff {
  section: string;
  sourceData: any;
  generatedContent: string;
  confidence: number;
  sources: string[];
  flags: string[];
}

export interface VerificationWorkflow {
  projectSlug: string;
  diffs: EnrichmentDiff[];
  flaggedItems: Array<{
    message: string;
    severity: 'warning' | 'error';
    suggestion?: string;
  }>;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_changes';
}
