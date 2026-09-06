/**
 * Vercel webhook: verify the signature, turn a production deployment event into
 * an ecosystem_sites update. Vercel signs the raw body with HMAC-SHA1 (hex) using
 * the webhook secret shown once at creation; header x-vercel-signature.
 */
import crypto from 'crypto';
import { rowFromWebhook } from '../../../../../scripts/lib/vercel-sites.mjs';

export function verifyVercelSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Returns { updated: boolean, reason } without throwing; the route decides the HTTP status. */
export async function handleVercelWebhook(event, supabase) {
  const patch = rowFromWebhook(event);
  if (!patch) return { updated: false, reason: 'ignored' };
  const { vercel_project_id, ...fields } = patch;
  const { data, error } = await supabase
    .from('ecosystem_sites')
    .update(fields)
    .eq('vercel_project_id', vercel_project_id)
    .select('slug');
  if (error) return { updated: false, reason: error.message };
  if (!data?.length) return { updated: false, reason: `no ecosystem_sites row for ${vercel_project_id}` };
  return { updated: true, reason: data.map((r) => r.slug).join(',') };
}
