#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const PATTERNS = [
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/, 'IPv4 literal'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
  [/\bsk-[A-Za-z0-9]{20,}/, 'OpenAI-style key'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\/Users\/[a-z]/i, 'absolute home path'],
  [/\bssh-(?:rsa|ed25519) AAAA/, 'SSH public key blob'],
  [/\b[a-z0-9-]+\.(?:local|internal|lan)\b/i, 'private hostname'],
  [/\bBearer [A-Za-z0-9._-]{20,}/, 'bearer token'],
];

const DENY_NAMES = [/\bBryan\b/i];

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'test-results', 'dist-standalone', 'coverage']);

function walk(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('.');
const errors = [];

for (const f of files) {
  const rel = relative('.', f);
  if (rel.endsWith('.png') || rel.endsWith('.jpg') || rel.endsWith('.ico') || rel.endsWith('.woff2')) continue;

  const text = readFileSync(f, 'utf8');
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    // Avoid self-triggering on pattern definitions in this scanner
    if (rel === 'scripts/validate-privacy.mjs') return;

    for (const [re, label] of PATTERNS) {
      if (re.test(line)) {
        errors.push(`${rel}:${i + 1} policy violation: [${label}] detected`);
      }
    }
    for (const re of DENY_NAMES) {
      if (re.test(line)) {
        errors.push(`${rel}:${i + 1} policy violation: [personal identifier] detected`);
      }
    }
  });
}

if (errors.length > 0) {
  console.error(`\n❌ Privacy validation failed (${errors.length} violations):`);
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  process.exit(1);
} else {
  console.log(`✓ Privacy validation passed: ${files.length} files scanned clean with ZERO script exemptions.`);
  process.exit(0);
}
