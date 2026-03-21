/**
 * Xero Tracking Categories Helper
 *
 * Fetches and caches tracking category + option IDs from Xero.
 * Maps ACT project codes → Xero TrackingOptionIDs for write-back.
 *
 * Usage:
 *   import { getTrackingMap, getTrackingCategoryId } from './lib/xero-tracking.mjs';
 *
 *   const map = await getTrackingMap(accessToken, tenantId);
 *   // map = { 'ACT-IN': { categoryId: '...', optionId: '...' }, ... }
 */

const XERO_API = 'https://api.xero.com/api.xro/2.0';

/**
 * Fetch all tracking categories and their options from Xero
 */
export async function fetchTrackingCategories(accessToken, tenantId) {
  const response = await fetch(`${XERO_API}/TrackingCategories`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Xero TrackingCategories API ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.TrackingCategories || [];
}

/**
 * Build a map of project code → { categoryId, optionId, optionName }
 * Looks for a tracking category named "Project Tracking" (or similar)
 */
export async function getTrackingMap(accessToken, tenantId) {
  const categories = await fetchTrackingCategories(accessToken, tenantId);

  const map = {};
  let projectCategory = null;

  // Find the "Project Tracking" category (might be named differently)
  for (const cat of categories) {
    const nameLower = cat.Name.toLowerCase();
    if (nameLower.includes('project') || nameLower.includes('tracking')) {
      projectCategory = cat;
      break;
    }
  }

  if (!projectCategory) {
    // Try first category as fallback
    if (categories.length > 0) {
      projectCategory = categories[0];
    } else {
      return { map, categoryId: null, categoryName: null, categories };
    }
  }

  for (const option of projectCategory.Options || []) {
    // Options might be named "ACT-IN", "ACT Infrastructure", etc.
    const optionName = option.Name;

    // Try to extract project code from option name
    const codeMatch = optionName.match(/ACT-[A-Z]{2}/);
    if (codeMatch) {
      map[codeMatch[0]] = {
        categoryId: projectCategory.TrackingCategoryID,
        optionId: option.TrackingOptionID,
        optionName: option.Name,
      };
    }

    // Also store by full name for fuzzy matching
    map[`_name:${optionName.toLowerCase()}`] = {
      categoryId: projectCategory.TrackingCategoryID,
      optionId: option.TrackingOptionID,
      optionName: option.Name,
    };
  }

  return {
    map,
    categoryId: projectCategory.TrackingCategoryID,
    categoryName: projectCategory.Name,
    categories,
    allOptions: projectCategory.Options || [],
  };
}

/**
 * Create a new tracking option in Xero (for new project codes)
 */
export async function createTrackingOption(accessToken, tenantId, categoryId, optionName) {
  const response = await fetch(`${XERO_API}/TrackingCategories/${categoryId}/Options`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Name: optionName }),
  });

  if (!response.ok) {
    throw new Error(`Create tracking option failed ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.Options?.[0] || null;
}

/**
 * Build the tracking line item payload for Xero API
 */
export function buildTrackingPayload(categoryId, optionId) {
  return [{
    TrackingCategoryID: categoryId,
    TrackingOptionID: optionId,
  }];
}
