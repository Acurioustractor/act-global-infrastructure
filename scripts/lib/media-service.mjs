/**
 * ACT Media Service
 *
 * Handles media assets for content publishing:
 * - Supabase storage for image/video hosting
 * - GHL media library integration
 * - Unsplash fallback for stock images
 * - Brand asset management
 *
 * Media Flow:
 * 1. Content created with media reference in Notion
 * 2. Media validated/uploaded to Supabase if needed
 * 3. Public URL passed to GHL for posting
 *
 * Supported sources:
 * - Supabase storage URLs
 * - External URLs (Unsplash, Cloudinary, etc.)
 * - Notion file attachments
 * - Local files (uploaded to Supabase)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { basename, extname } from 'path';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: 'content-media'  // Create this bucket in Supabase
  },

  // Brand assets (pre-uploaded to Supabase)
  brandAssets: {
    logo: 'brand/act-logo.png',
    logoLight: 'brand/act-logo-light.png',
    icon: 'brand/act-icon.png',
    pattern: 'brand/pattern-seeds.png',
    cockatoo: 'brand/cockatoo.png'
  },

  // Project-specific assets
  projectAssets: {
    'JusticeHub': 'projects/justicehub-hero.png',
    'Empathy Ledger': 'projects/empathy-ledger-hero.png',
    'ACT Farm': 'projects/act-farm-hero.png',
    'The Harvest': 'projects/harvest-hero.png',
    'Goods on Country': 'projects/goods-hero.png',
    'ACT Placemat': 'projects/placemat-hero.png'
  },

  // Supported media types
  supportedTypes: {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    video: ['.mp4', '.mov', '.webm', '.avi']
  },

  // Size limits (bytes)
  sizeLimits: {
    image: 5 * 1024 * 1024,   // 5MB
    video: 100 * 1024 * 1024  // 100MB
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEDIA SERVICE CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class MediaService {
  constructor() {
    this.supabaseUrl = CONFIG.supabase.url;
    this.bucket = CONFIG.supabase.bucket;

    // Initialize Supabase client if keys available
    const key = CONFIG.supabase.serviceKey || CONFIG.supabase.anonKey;
    if (key) {
      this.supabase = createClient(this.supabaseUrl, key);
    }
  }

  /**
   * Get public URL for a Supabase storage path
   */
  getPublicUrl(path) {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${path}`;
  }

  /**
   * Get brand asset URL
   */
  getBrandAsset(assetName) {
    const path = CONFIG.brandAssets[assetName];
    if (!path) {
      throw new Error(`Unknown brand asset: ${assetName}`);
    }
    return this.getPublicUrl(path);
  }

  /**
   * Get project hero image URL
   */
  getProjectAsset(projectName) {
    const path = CONFIG.projectAssets[projectName];
    if (!path) {
      return null; // No specific asset, use default
    }
    return this.getPublicUrl(path);
  }

  /**
   * Validate a media URL
   */
  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      const ext = extname(urlObj.pathname).toLowerCase();

      // Check if it's a supported type
      const isImage = CONFIG.supportedTypes.image.includes(ext);
      const isVideo = CONFIG.supportedTypes.video.includes(ext);

      // Also accept common CDN patterns without extensions
      const isCDN = url.includes('unsplash.com') ||
                    url.includes('cloudinary.com') ||
                    url.includes('supabase.co') ||
                    url.includes('youtube.com') ||
                    url.includes('vimeo.com');

      return {
        valid: isImage || isVideo || isCDN,
        type: isVideo ? 'video' : 'image',
        url,
        extension: ext
      };

    } catch (e) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Upload a local file to Supabase storage
   */
  async uploadFile(filePath, destination = null) {
    if (!this.supabase) {
      throw new Error('Supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
    }

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileName = basename(filePath);
    const ext = extname(filePath).toLowerCase();
    const destPath = destination || `uploads/${Date.now()}-${fileName}`;

    // Determine content type
    let contentType = 'application/octet-stream';
    if (CONFIG.supportedTypes.image.includes(ext)) {
      contentType = `image/${ext.replace('.', '')}`;
      if (ext === '.jpg') contentType = 'image/jpeg';
    } else if (CONFIG.supportedTypes.video.includes(ext)) {
      contentType = `video/${ext.replace('.', '')}`;
    }

    const fileBuffer = readFileSync(filePath);

    const { data, error } = await this.supabase
      .storage
      .from(this.bucket)
      .upload(destPath, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return {
      path: data.path,
      publicUrl: this.getPublicUrl(data.path)
    };
  }

  /**
   * Upload from URL (download then re-upload to Supabase)
   */
  async uploadFromUrl(sourceUrl, destination = null) {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    // Generate destination path
    const ext = contentType.split('/')[1] || 'png';
    const destPath = destination || `uploads/${Date.now()}.${ext}`;

    const { data, error } = await this.supabase
      .storage
      .from(this.bucket)
      .upload(destPath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return {
      path: data.path,
      publicUrl: this.getPublicUrl(data.path)
    };
  }

  /**
   * Process Notion file attachment
   * Notion files are temporary URLs that expire - need to re-upload
   */
  async processNotionFile(notionFile) {
    // Notion file object structure
    const url = notionFile.external?.url || notionFile.file?.url;

    if (!url) {
      return null;
    }

    // If it's already a Supabase URL, return as-is
    if (url.includes('supabase.co')) {
      return { url, processed: false };
    }

    // If it's an external URL (not Notion-hosted), validate and return
    if (notionFile.external?.url && !url.includes('notion')) {
      return { url, processed: false };
    }

    // For Notion-hosted files, re-upload to Supabase for permanence
    try {
      const result = await this.uploadFromUrl(url);
      return { url: result.publicUrl, processed: true };
    } catch (error) {
      console.warn(`Failed to process Notion file: ${error.message}`);
      return { url, processed: false, error: error.message };
    }
  }

  /**
   * Get suggested image for content based on keywords/project
   */
  suggestImage(content) {
    const text = content.toLowerCase();

    // Check for project mentions
    for (const [project, asset] of Object.entries(CONFIG.projectAssets)) {
      if (text.includes(project.toLowerCase())) {
        return {
          type: 'project',
          url: this.getPublicUrl(asset),
          reason: `Matched project: ${project}`
        };
      }
    }

    // Check for brand/general keywords
    if (text.includes('seed') || text.includes('growth') || text.includes('plant')) {
      return {
        type: 'brand',
        url: this.getBrandAsset('pattern'),
        reason: 'Matched theme: growth/seeds'
      };
    }

    if (text.includes('ecosystem') || text.includes('together') || text.includes('community')) {
      return {
        type: 'brand',
        url: this.getBrandAsset('cockatoo'),
        reason: 'Matched theme: community/ecosystem'
      };
    }

    // Default to logo
    return {
      type: 'brand',
      url: this.getBrandAsset('logo'),
      reason: 'Default brand asset'
    };
  }

  /**
   * Prepare media for GHL posting
   * Returns array of media objects in GHL format
   */
  prepareForGHL(mediaUrls) {
    if (!mediaUrls || mediaUrls.length === 0) {
      return [];
    }

    return mediaUrls.map(url => {
      const validation = this.validateUrl(url);
      return {
        type: validation.type || 'image',
        url
      };
    });
  }

  /**
   * List files in a storage path
   */
  async listFiles(path = '') {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await this.supabase
      .storage
      .from(this.bucket)
      .list(path);

    if (error) {
      throw new Error(`List failed: ${error.message}`);
    }

    return data.map(file => ({
      name: file.name,
      path: path ? `${path}/${file.name}` : file.name,
      publicUrl: this.getPublicUrl(path ? `${path}/${file.name}` : file.name),
      size: file.metadata?.size,
      type: file.metadata?.mimetype
    }));
  }

  /**
   * Check if brand assets exist in storage
   */
  async verifyBrandAssets() {
    const results = {};

    for (const [name, path] of Object.entries(CONFIG.brandAssets)) {
      const url = this.getPublicUrl(path);
      try {
        const response = await fetch(url, { method: 'HEAD' });
        results[name] = {
          exists: response.ok,
          url,
          path
        };
      } catch (e) {
        results[name] = {
          exists: false,
          url,
          path,
          error: e.message
        };
      }
    }

    return results;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate Unsplash URL for a keyword
 */
export function getUnsplashUrl(keyword, width = 1200, height = 630) {
  const query = encodeURIComponent(keyword);
  return `https://source.unsplash.com/${width}x${height}/?${query}`;
}

/**
 * Create a social media image with text overlay
 * (Placeholder - would need canvas or image processing library)
 */
export async function generateSocialImage(options) {
  const { text, project, style = 'default' } = options;

  // For now, return a suggested Unsplash image
  // In production, this would use canvas/sharp to generate custom images
  const keywords = project || 'technology community nature';
  return {
    type: 'suggested',
    url: getUnsplashUrl(keywords),
    note: 'Generated from Unsplash - consider uploading custom image'
  };
}

/**
 * Extract media URLs from Notion page properties
 */
export function extractNotionMedia(properties) {
  const mediaUrls = [];

  // Check Image property (files type)
  if (properties['Image']?.files?.length > 0) {
    properties['Image'].files.forEach(f => {
      if (f.external?.url) mediaUrls.push(f.external.url);
      if (f.file?.url) mediaUrls.push(f.file.url);
    });
  }

  // Check Video link property (url type)
  if (properties['Video link']?.url) {
    mediaUrls.push(properties['Video link'].url);
  }

  // Check for any rich_text that might contain URLs
  const textFields = ['Key Message/Story', 'Notes', 'Fun Element'];
  for (const field of textFields) {
    const text = properties[field]?.rich_text?.[0]?.plain_text || '';
    const urlMatches = text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|mp4|mov)/gi);
    if (urlMatches) {
      mediaUrls.push(...urlMatches);
    }
  }

  return [...new Set(mediaUrls)]; // Dedupe
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FACTORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function createMediaService() {
  return new MediaService();
}

export { CONFIG as MEDIA_CONFIG };
