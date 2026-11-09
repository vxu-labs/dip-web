import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { projectLibrary } from '../lib/project-library.mjs';
import { parseGlobalSkills } from '../lib/global-skill-import.mjs';

test('project library reads the selected source branch and compares a pinned version', async () => {
  const tree = 'a'.repeat(40), commit = 'b'.repeat(40);
  const bytes = Buffer.from('# Testing');
  const indexedHash = createHash('sha256').update(bytes).digest('hex');
  const repo = 'example/project';
  const paths = [];
  const files = ['.dip-knowledge.json', 'docs/test.md', 'game/.agents/skills/deploy/SKILL.md',
    'game/.agents/skills/deploy/agents/openai.yaml', 'linked/SKILL.md', 'node_modules/fake/SKILL.md']
    .map((path, i) => ({path, type:'blob', mode:i === 4 ? '120000' : '100644', sha:String(i).repeat(40), size:64}));
  const request = async (token, path) => {
    assert.equal(token, 'session-token');
    paths.push(path);
    if (path.endsWith('commits/preview%2Fworld')) return {data:{sha:commit,commit:{tree:{sha:tree}}}};
    if (path.endsWith('?recursive=1')) return {data:{tree:files}};
    return {data:{encoding:'base64',size:bytes.length,content:bytes.toString('base64')}};
  };
  const readManifest = async () => ({version:1, entries:[
    {id:'test',title:'Testing',category:'testing',source:'docs/test.md',indexedHash},
    {id:'old',title:'Old',category:'testing',source:'docs/test.md',indexedHash:'f'.repeat(64),summary:'Old guidance'},
  ]});
  const result = await projectLibrary('session-token', repo, 'preview/world', request, readManifest);
  assert.equal(result.commit, commit);
  assert.equal(result.skills.length, 1);
  assert.equal(result.skills[0].scope, 'game');
  assert.equal(result.skills[0].policy, 'game/.agents/skills/deploy/agents/openai.yaml');
  assert.deepEqual(result.knowledge.map(({currentness}) => currentness), ['current','stale']);
  assert.equal(result.knowledge[1].summary, undefined);
  assert.equal(paths.length, 4);
});

test('global import discards paths, extra fields and project data', () => {
  assert.deepEqual(parseGlobalSkills({format:'dip-global-skills-v1', projects:['private'],
    skills:[{name:'deploy',host:'codex',activation:'explicit-only',source:'/private/path'}]}),
    [{name:'deploy',host:'codex',activation:'explicit-only'}]);
  assert.throws(() => parseGlobalSkills({format:'dip-global-skills-v1',skills:[{name:'invalid'}]}));
});
