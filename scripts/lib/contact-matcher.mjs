/**
 * Contact Matcher Library — Re-exports from @act/contacts
 *
 * This file is a compatibility shim. The canonical implementation
 * now lives in packages/contacts/src/matching/index.mjs.
 *
 * Existing scripts can continue importing from here:
 *   import { ContactMatcher } from './lib/contact-matcher.mjs';
 *
 * New code should import from the package:
 *   import { ContactMatcher } from '@act/contacts/matching';
 */

export { ContactMatcher } from '../../packages/contacts/src/matching/index.mjs';
export { default } from '../../packages/contacts/src/matching/index.mjs';
