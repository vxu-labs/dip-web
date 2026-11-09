import { blobJSON, github, pool } from './github.mjs';

const manifest = '.dip-knowledge.json';
const excluded = new Set(['.git', '.dip', '.dip-local', 'node_modules']);
const sourcePath = (value) => typeof value === 'string' && value.length <= 1024 &&
  !/[\\:\x00-\x1f]/.test(value) && value.split('/').every((part) =>
    part && part !== '.' && part !== '..' && !excluded.has(part.toLowerCase()));

function skillInfo(source) {
  const match = /^(?:(.*)\/)?\.(agents|claude)\/skills\/([^/]+)\/SKILL\.md$/i.exec(source);
  const parts = source.split('/');
  return {
    source,
    name: parts.at(-2) || 'Skill',
    scope: match ? match[1] || '.' : parts.slice(0, -2).join('/') || '.',
    host: match ? (match[2].toLowerCase() === 'agents' ? 'codex' : 'claude') : 'manual',
    activation: match ? 'host-managed' : 'explicit-only',
  };
}

const short = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
export async function projectLibrary(token, repo, branch, request = github, readManifest = blobJSON) {
  const { data: revision } = await request(token, `/repos/${repo}/commits/${encodeURIComponent(branch)}`);
  if (!/^[a-f0-9]{40}$/.test(revision.sha) || !/^[a-f0-9]{40}$/.test(revision.commit?.tree?.sha))
    throw new Error('Invalid source revision');
  const { data } = await request(token, `/repos/${repo}/git/trees/${revision.commit.tree.sha}?recursive=1`);
  if (data.truncated) throw new Error('The repository tree is too large to list its skills completely.');
  const files = new Map(data.tree.filter((entry) =>
    entry.type === 'blob' && ['100644','100755'].includes(entry.mode) && sourcePath(entry.path),
  ).map((entry) => [entry.path, entry]));
  const manifestFile = files.get(manifest);
  const warnings = [];
  let entries = [];
  if (manifestFile) {
    try {
      if (manifestFile.size > 256 * 1024) throw new Error('Large manifest');
      const index = await readManifest(token, repo, manifestFile.sha);
      if (index?.version !== 1 || !Array.isArray(index.entries) || index.entries.length > 200)
        throw new Error('Invalid manifest');
      entries = index.entries.filter((entry) => sourcePath(entry?.source));
    } catch {
      warnings.push('The project knowledge manifest could not be read.');
    }
  }
  const sources = [...files.keys()].filter((source) => /(^|\/)SKILL\.md$/i.test(source));
  if (sources.length > 500) warnings.push('Showing the first 500 skill sources for this repository.');
  const skills = sources.sort().slice(0,500).map((source) => {
    const skill = skillInfo(source);
    const policy = source.replace(/SKILL\.md$/i,'agents/openai.yaml');
    return { ...skill, ...(skill.host === 'codex' && files.has(policy) && { policy }),
      gitBlob: files.get(source).sha };
  });
  // Read only files with an explicit pin. Git's blob IDs and DIP's raw SHA-256 are different.
  const knowledge = await pool(entries, async (entry) => {
    const file = files.get(entry.source);
    let currentness = !file ? 'missing' : 'unindexed';
    if (file && /^[a-f0-9]{64}$/.test(entry.indexedHash)) {
      currentness = 'unavailable';
      if (file.size <= 1024 * 1024) {
        try {
          const { data: blob } = await request(token, `/repos/${repo}/git/blobs/${file.sha}`);
          if (blob.encoding === 'base64' && blob.size <= 1024 * 1024) {
            const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g,'')), (char) => char.charCodeAt(0));
            const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
              (byte) => byte.toString(16).padStart(2,'0')).join('');
            currentness = sha === entry.indexedHash ? 'current' : 'stale';
          }
        } catch (error) {
          if (error?.status === 401 || error?.status === 403 || error?.status === 429) throw error;
        }
      }
    }
    return { id: short(entry.id,96), source: entry.source, title: short(entry.title,150),
      category: short(entry.category,40), currentness,
      scopes: Array.isArray(entry.scopes) ? entry.scopes.filter(sourcePath).slice(0,12) : [],
      ...(currentness === 'current' && { summary: short(entry.summary,500) }) };
  });
  const trackedInstructions = [...files.keys()].filter((source) => /(^|\/)(AGENTS(\.override)?|CLAUDE)\.md$/i.test(source));
  const indexed = new Set(knowledge.map((entry) => entry.source));
  for (const source of trackedInstructions.slice(0,100)) {
    if (!indexed.has(source))
      knowledge.push({ id: source, title: source, source, category: 'instruction', currentness: 'unindexed',
        scopes: [source.split('/').slice(0,-1).join('/') || '.'] });
  }
  return { repo, branch, commit: revision.sha, skills, knowledge, warnings };
}
