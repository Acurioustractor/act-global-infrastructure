/**
 * Bundle notion-workers into a single file for ntn deploy.
 *
 * @act/intel is inlined (workspace dep, not available on remote npm).
 * @notionhq/workers and @supabase/supabase-js stay external (provided by ntn runtime).
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],  // bundle from TS source directly
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/index.js',
  allowOverwrite: true,
  external: [
    '@notionhq/workers',
    '@supabase/supabase-js',
  ],
  logLevel: 'warning',
});

console.log('✓ Bundled dist/index.js (with @act/intel inlined)');
