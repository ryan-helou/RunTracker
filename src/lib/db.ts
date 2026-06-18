import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Lazily-constructed Neon HTTP client.
 *
 * We construct it on first use (rather than at import time) so that pages and
 * routes that never touch the database can still render even if DATABASE_URL
 * has not been configured yet.
 */
let cached: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local (see README).",
    );
  }
  cached = neon(url);
  return cached;
}
