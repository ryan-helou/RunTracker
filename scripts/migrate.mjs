// Applies src/lib/schema.sql to the Neon database in DATABASE_URL.
// Usage: npm run db:push
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env loader so we don't need a dotenv dependency.
function loadEnv(file) {
  try {
    const txt = readFileSync(join(root, file), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* file may not exist; ignore */
  }
}
loadEnv(".env.local");
loadEnv(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(join(root, "src/lib/schema.sql"), "utf8");
// Strip line comments first so semicolons inside comments don't split statements.
const stripped = schema
  .split("\n")
  .map((line) => {
    const i = line.indexOf("--");
    return i >= 0 ? line.slice(0, i) : line;
  })
  .join("\n");
const statements = stripped
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} statement(s) to Neon...`);
for (const stmt of statements) {
  const label = stmt.split("\n").find((l) => l.trim() && !l.trim().startsWith("--")) ?? stmt;
  console.log("  →", label.trim().slice(0, 72));
  await sql.query(stmt);
}
console.log("✓ Migration complete.");
