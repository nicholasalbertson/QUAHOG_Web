import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PROTECTED_PATHS} from '../production-lineage.mjs';
import {createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const preflight=join(root,'scripts/production-preflight.mjs');
const rebaseline=join(root,'scripts/production-rebaseline.mjs');
const run=(...a)=>spawnSync(process.execPath,a,{encoding:'utf8'});

// The committed baseline pins one release package's exact bytes, so it goes
// stale on the next source commit (that is how this test went red after
// 2026-11-02). The tool's LOGIC is tested against a baseline generated from
// the tree under test; currency of the committed baseline is a release step
// (docs/RELEASE-OPS.md), not a unit-test property.
test('production preflight fails closed when live source differs, never writes live files',()=>{
 const t=mkdtempSync(join(tmpdir(),'quahog-live-source-'));
 try {
  const manifestPath=join(t,'baseline.json');
  const gen=run(rebaseline,'--kind','focused','--out',manifestPath);
  assert.equal(gen.status,0,gen.stderr);
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  const live=join(t,'live');mkdirSync(live);
  const missing=run(preflight,'--manifest',manifestPath,'--live-dir',live);
  assert.equal(missing.status,1);
  assert.equal(JSON.parse(missing.stdout).verdict,'blocked_pending_reconciliation');
  // One source of truth for the protected list: the tool's own export.
  for(const p of PROTECTED_PATHS)assert.ok(existsSync(join(root,p)),`protected path missing from package: ${p}`);
  for(const p of new Set([...PROTECTED_PATHS,...Object.keys(manifest.expectedModified)])){mkdirSync(join(live,p.split('/').slice(0,-1).join('/')),{recursive:true});cpSync(join(root,p),join(live,p));}
  const identical=run(preflight,'--manifest',manifestPath,'--live-dir',live);
  assert.equal(identical.status,0,identical.stdout);
  assert.equal(JSON.parse(identical.stdout).verdict,'sources_compatible_review_and_checks_still_required');
  assert.equal(JSON.parse(identical.stdout).checkedProtected,PROTECTED_PATHS.length);
  writeFileSync(join(live,'src/store.ts'),readFileSync(join(live,'src/store.ts'),'utf8')+'\n// new production edit\n');
  const changed=run(preflight,'--manifest',manifestPath,'--live-dir',live);
  assert.equal(changed.status,1);
  assert.ok(JSON.parse(changed.stdout).conflicts.some(x=>x.path==='src/store.ts'));
  assert.ok(readFileSync(join(live,'src/store.ts'),'utf8').endsWith('// new production edit\n'));
 } finally {rmSync(t,{recursive:true,force:true});}
});

test('focused rebaseline keeps the prior-handoff hashes and never drops an accepted one',()=>{
 const t=mkdtempSync(join(tmpdir(),'quahog-focused-rebase-'));
 try{
  const out=join(t,'baseline.json');
  assert.equal(run(rebaseline,'--kind','focused','--out',out).status,0);
  const prior=JSON.parse(readFileSync(join(root,'scripts/production-baseline.json'),'utf8'));
  const next=JSON.parse(readFileSync(out,'utf8'));
  assert.deepEqual(next.approvedR3,prior.approvedR3);
  assert.equal(next.baselineArchiveSHA256,prior.baselineArchiveSHA256);
  for(const [p,h] of Object.entries(prior.expectedModified)){
   const accepted=[next.expectedModified[p]?.beforeSHA256,next.expectedModified[p]?.afterSHA256,...(next.lineage[p]??[])];
   assert.ok(accepted.includes(h.beforeSHA256),`${p}: prior-handoff hash dropped`);
   assert.ok(accepted.includes(h.afterSHA256),`${p}: previous package hash dropped`);
  }
 }finally{rmSync(t,{recursive:true,force:true});}
});

// Codex review on PR #28 (P1): a path retired from the package must still be
// reconciled. An unknown live copy blocks; a live copy in lineage passes.
test('focused preflight blocks an unknown live copy of a retired path',()=>{
 const t=mkdtempSync(join(tmpdir(),'quahog-focused-retired-'));
 try{
  const gone='src/__retired_fixture__.ts';
  const prior=JSON.parse(readFileSync(join(root,'scripts/production-baseline.json'),'utf8'));
  const sha=s=>createHash('sha256').update(s).digest('hex');
  prior.expectedModified[gone]={beforeSHA256:sha('old live\n'),afterSHA256:sha('old package\n')};
  const from=join(t,'prior.json'),out=join(t,'baseline.json');
  writeFileSync(from,JSON.stringify(prior));
  assert.equal(run(rebaseline,'--kind','focused','--from',from,'--out',out).status,0);
  const manifest=JSON.parse(readFileSync(out,'utf8'));
  assert.ok(manifest.retired.includes(gone));
  const live=join(t,'live');mkdirSync(live);
  for(const p of new Set([...PROTECTED_PATHS,...Object.keys(manifest.expectedModified)])){mkdirSync(join(live,p.split('/').slice(0,-1).join('/')),{recursive:true});cpSync(join(root,p),join(live,p));}
  mkdirSync(join(live,'src'),{recursive:true});
  writeFileSync(join(live,gone),'unmerged live edit\n');
  const bad=run(preflight,'--manifest',out,'--live-dir',live);
  assert.equal(bad.status,1);
  assert.ok(JSON.parse(bad.stdout).conflicts.some(x=>x.path===gone&&x.reason==='retired_path_live_version_not_in_authenticated_lineage'));
  writeFileSync(join(live,gone),'old live\n');
  const ok=run(preflight,'--manifest',out,'--live-dir',live);
  assert.equal(ok.status,0,ok.stdout);
  rmSync(join(live,gone));
  assert.equal(run(preflight,'--manifest',out,'--live-dir',live).status,0);
 }finally{rmSync(t,{recursive:true,force:true});}
});
