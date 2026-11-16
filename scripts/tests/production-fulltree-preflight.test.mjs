import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, cpSync, rmSync, appendFileSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const cli=join(root,'scripts/production-fulltree-preflight.mjs');
const rebaseline=join(root,'scripts/production-rebaseline.mjs');
const run=(...a)=>spawnSync(process.execPath,a,{encoding:'utf8',maxBuffer:1<<28});
const committed=()=>JSON.parse(readFileSync(join(root,'scripts/production-fulltree-baseline.json'),'utf8'));
const list=v=>v==null?[]:Array.isArray(v)?v:[v];

// See production-preflight.test.mjs: the tool's logic is tested against a
// baseline generated from the tree under test, so the test cannot go stale
// with every source commit. Reuses exact shipped bytes. No network, no
// deployment, no mutation of the package source.
test('full-tree preflight accepts identical current source and blocks an altered protected file',()=>{
 const scratch=mkdtempSync(join(tmpdir(),'quahog-fulltree-'));
 const live=join(scratch,'production-source');
 try{
  const manifestPath=join(scratch,'baseline.json');
  const gen=run(rebaseline,'--kind','fulltree','--out',manifestPath);
  assert.equal(gen.status,0,gen.stderr);
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  cpSync(root,live,{recursive:true,filter:p=>!p.includes('/node_modules/')&&!p.endsWith('/node_modules')&&!p.includes('/dist/')&&!p.endsWith('/dist')&&!p.includes('/.git/')&&!p.endsWith('/.git')});
  const clean=run(cli,'--manifest',manifestPath,'--live-dir',live);
  assert.equal(clean.status,0,clean.stdout.slice(0,4000)||clean.stderr);
  const ok=JSON.parse(clean.stdout);
  assert.equal(ok.verdict,'SOURCE_PATHS_RECONCILED_REQUIRE_BUILD_AND_DEVICE_QA');
  assert.equal(ok.removedFromPackage,manifest.removed.length);

  // A live file edited outside the authenticated lineage blocks.
  appendFileSync(join(live,'src/store.ts'),'\n// simulated unmerged live modification\n');
  const corrupt=run(cli,'--manifest',manifestPath,'--live-dir',live);
  assert.equal(corrupt.status,1);
  const report=JSON.parse(corrupt.stdout);
  assert.equal(report.verdict,'BLOCK_PRODUCTION_UNRECONCILED');
  assert.ok(report.conflicts.some(x=>x.path==='src/store.ts'));
  cpSync(join(root,'src/store.ts'),join(live,'src/store.ts'));

  // A path the package stopped shipping: an unknown live copy blocks...
  const gone=manifest.removed.find(p=>p in manifest.before);
  if(gone){
   mkdirSync(dirname(join(live,gone)),{recursive:true});
   writeFileSync(join(live,gone),'// live edit of a file the package no longer ships\n');
   const stray=JSON.parse(run(cli,'--manifest',manifestPath,'--live-dir',live).stdout);
   assert.ok(stray.conflicts.some(x=>x.path===gone&&x.reason==='removed_path_live_version_not_in_authenticated_lineage'));
   rmSync(join(live,gone));
  }
  // ...and a tracked file missing from live still blocks.
  rmSync(join(live,'src/store.ts'));
  const lost=JSON.parse(run(cli,'--manifest',manifestPath,'--live-dir',live).stdout);
  assert.ok(lost.conflicts.some(x=>x.path==='src/store.ts'&&x.reason==='live_tracked_file_missing'));
 }finally{rmSync(scratch,{recursive:true,force:true});}
});

test('full-tree rebaseline is deterministic, keeps `before` verbatim and never drops an accepted hash',()=>{
 const scratch=mkdtempSync(join(tmpdir(),'quahog-fulltree-rebase-'));
 try{
  const a=join(scratch,'a.json'),b=join(scratch,'b.json');
  assert.equal(run(rebaseline,'--kind','fulltree','--out',a).status,0);
  assert.equal(run(rebaseline,'--kind','fulltree','--out',b).status,0);
  assert.equal(readFileSync(a,'utf8'),readFileSync(b,'utf8'));
  const prior=committed(),next=JSON.parse(readFileSync(a,'utf8'));
  assert.deepEqual(next.before,prior.before);
  const accepted=p=>new Set([next.before[p],next.after[p],next.added[p],...list(next.intermediates[p]),...list(next.addedIntermediates[p])]);
  for(const [p,h] of Object.entries(prior.after))assert.ok(accepted(p).has(h),`${p}: previous package hash dropped`);
  for(const [p,h] of Object.entries(prior.added))assert.ok(accepted(p).has(h),`${p}: previous added hash dropped`);
  for(const [p,h] of Object.entries(prior.intermediates??{}))for(const x of list(h))assert.ok(accepted(p).has(x),`${p}: intermediate dropped`);
  for(const [p,h] of Object.entries(prior.addedIntermediates??{}))for(const x of list(h))assert.ok(accepted(p).has(x),`${p}: added intermediate dropped`);
  // Every prior path is either still shipped or explicitly declared removed.
  for(const p of Object.keys(prior.before))assert.ok(p in next.after||next.removed.includes(p),`${p}: silently dropped`);
 }finally{rmSync(scratch,{recursive:true,force:true});}
});

test('committed baseline, when stale, blocks with an explicit reason (never passes silently)',()=>{
 const scratch=mkdtempSync(join(tmpdir(),'quahog-fulltree-stale-'));
 try{
  const live=join(scratch,'live');mkdirSync(live);
  const r=run(cli,'--live-dir',live);
  const report=JSON.parse(r.stdout);
  assert.equal(r.status,1);
  assert.equal(report.verdict,'BLOCK_PRODUCTION_UNRECONCILED');
 }finally{rmSync(scratch,{recursive:true,force:true});}
});
