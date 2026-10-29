import { execFileSync } from 'node:child_process';

// Read staged blobs, not working files: this checks what a commit will publish.
const entries = execFileSync('git', ['ls-files', '--stage', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const findings = [];
const privatePath = /(^|\/)(?:\.dip|\.dip-local|\.wrangler|\.sites-runtime|\.agents|\.claude|\.codex|node_modules|dist|\.next|\.vinext|backups|audit-reports)(\/|$)|(?:^|\/)\.env(?:\.|$)|(?:^|\/)\.dev\.vars|\.(?:pem|key|p12|pfx|sqlite(?:3)?(?:-wal|-shm)?|db|log)$/i;
const sensitivePatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub credential', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['deployment identity', /\bappg(?:prj|dep)_[A-Za-z0-9]+\b/],
  ['personal filesystem path', /\/(?:Users|home)\/[A-Za-z0-9._-]+\//],
  ['credential in URL', /https?:\/\/[^\s/@:]+:[^\s/@]+@/],
];
for (const entry of entries) {
  const [metadata, path] = entry.split('\t');
  const [mode, blob, stage] = metadata.split(' ');
  if (stage !== '0') findings.push(`${path}: unresolved index entry`);
  if (mode !== '100644' && mode !== '100755') findings.push(`${path}: symlinks and submodules need explicit review`);
  if ((privatePath.test(path) && !['.env.example', '.dip/config.json'].includes(path)) ||
      (path.startsWith('.openai/') && path !== '.openai/hosting.example.json')) {
    findings.push(`${path}: private or generated file`);
  }
  const bytes = execFileSync('git', ['cat-file', 'blob', blob], { maxBuffer: 32 * 1024 * 1024 });
  if (bytes.includes(0)) continue; // Binary assets require visual/manual review.
  const text = bytes.toString('utf8');
  for (const [label, pattern] of sensitivePatterns) {
    if (pattern.test(text)) findings.push(`${path}: ${label}`);
  }
  if (path === '.env.example' && text.split('\n').some(line => /^[A-Z][A-Z0-9_]*=.+/.test(line))) {
    findings.push(`${path}: environment template must have empty values`);
  }
}
if (!entries.length) findings.push('No staged/tracked source files to check');
if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Publication boundary passed for ${entries.length} staged/tracked files.`);
}
