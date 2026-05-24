#!/usr/bin/env -S node --import tsx
/**
 * Propagation Audit
 * -----------------
 * Reads src/lib/patterns/registry.ts, walks the codebase, and reports any
 * file that *should* implement a pattern but doesn't. Also scans for forbidden
 * tokens (placeholders, TODOs) in shipped source.
 *
 * Run: `bunx tsx scripts/audit-propagate.ts`  (or `npm run audit` once wired up)
 * Exits 1 on any violation so it can gate CI / pre-commit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_PATTERNS, FORBIDDEN_TOKENS } from '../src/lib/patterns/registry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

interface Violation {
  file: string;
  pattern: string;
  kind: 'missing' | 'forbidden';
  detail: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function expandTargets(globs: string[]): string[] {
  // Tiny glob — supports exact paths and trailing `/*` directory matches.
  const results = new Set<string>();
  const all = walk(path.join(ROOT, 'src'));
  for (const g of globs) {
    const abs = path.join(ROOT, g);
    if (g.endsWith('/*')) {
      const prefix = abs.slice(0, -2);
      all.filter((f) => f.startsWith(prefix)).forEach((f) => results.add(f));
    } else if (fs.existsSync(abs)) {
      results.add(abs);
    }
  }
  return [...results];
}

function audit(): Violation[] {
  const violations: Violation[] = [];

  // Pattern propagation
  for (const [name, cfg] of Object.entries(UI_PATTERNS)) {
    const targets = expandTargets(cfg.files);
    if (targets.length === 0) {
      violations.push({
        file: cfg.files.join(', '),
        pattern: name,
        kind: 'missing',
        detail: `No files matched: ${cfg.description}`,
      });
      continue;
    }
    for (const file of targets) {
      const content = fs.readFileSync(file, 'utf-8');
      const hit = cfg.matchers.some((m) => content.includes(m));
      if (!hit) {
        violations.push({
          file: path.relative(ROOT, file),
          pattern: name,
          kind: 'missing',
          detail: `Expected one of: ${cfg.matchers.join(', ')} — ${cfg.description}`,
        });
      }
    }
  }

  // Forbidden tokens across all source
  const allFiles = walk(path.join(ROOT, 'src'));
  for (const file of allFiles) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf-8');
    for (const { token, reason, ignore } of FORBIDDEN_TOKENS) {
      if (ignore && ignore.test(rel)) continue;
      if (content.toLowerCase().includes(token.toLowerCase())) {
        violations.push({ file: rel, pattern: token, kind: 'forbidden', detail: reason });
      }
    }
  }

  return violations;
}

const violations = audit();

if (violations.length === 0) {
  console.log('\x1b[32m✓ Propagation audit passed — all patterns present, no forbidden tokens.\x1b[0m');
  process.exit(0);
}

console.error(`\x1b[31m✗ Propagation audit failed (${violations.length} issues)\x1b[0m\n`);
for (const v of violations) {
  console.error(`  [${v.kind}] ${v.pattern}`);
  console.error(`    file:   ${v.file}`);
  console.error(`    detail: ${v.detail}\n`);
}
process.exit(1);
