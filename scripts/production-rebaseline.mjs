#!/usr/bin/env node
/** Regenerate the PACKAGE side of a preflight baseline from the current
 * source tree. No deployment, no source mutation; writes only --out.
 *
 *   node scripts/production-rebaseline.mjs --kind fulltree --out <file>
 *   node scripts/production-rebaseline.mjs --kind focused  --out <file>
 *
 * Fail-closed rules this generator keeps:
 * - `before` (the authenticated prior-handoff hashes) is copied verbatim.
 * - No previously accepted hash is ever dropped: when a path's package hash
 *   changes, the old one moves into the path's lineage list, so a live tree
 *   that still runs the previous package is recognised, not waved through.
 * - Paths the package no longer ships are DECLARED in `removed`; a live copy
 *   must be absent or match a lineage hash.
 * The output is deterministic (no timestamps): same tree, same bytes.
 * Overwriting a committed baseline is a release decision — review the diff.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha, asList, listPackageFiles, arg} from './production-lineage.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const kind=arg('--kind'), out=arg('--out');
if(!['fulltree','focused'].includes(kind)||!out){
 console.error('usage: node scripts/production-rebaseline.mjs --kind fulltree|focused --out <file> [--from <manifest>]');
 process.exit(2);
}
const defaults={fulltree:'scripts/production-fulltree-baseline.json',focused:'scripts/production-baseline.json'};
const prior=JSON.parse(readFileSync(resolve(arg('--from')??join(root,defaults[kind])),'utf8'));
const uniq=(list,...drop)=>[...new Set(list.filter(Boolean))].filter(h=>!drop.includes(h));
const sorted=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a<b?-1:a>b?1:0));
const hashOf=p=>existsSync(join(root,p))?sha(join(root,p)):null;

let next;
if(kind==='fulltree'){
 const files=listPackageFiles(root);
 const inPackage=new Set(files);
 const after={},intermediates={},added={},addedIntermediates={};
 const removed=new Set(prior.removed??[]);
 for(const [p,before] of Object.entries(prior.before)){
  const keep=uniq([...asList(prior.intermediates?.[p]),prior.after?.[p]],before);
  if(!inPackage.has(p)){removed.add(p);if(keep.length)intermediates[p]=keep;continue;}
  removed.delete(p);
  after[p]=sha(join(root,p));
  const lineage=keep.filter(h=>h!==after[p]);
  if(lineage.length)intermediates[p]=lineage;
 }
 for(const p of files){
  if(p in prior.before)continue;
  removed.delete(p);
  added[p]=sha(join(root,p));
  const lineage=uniq([...asList(prior.addedIntermediates?.[p]),prior.added?.[p]],added[p]);
  if(lineage.length)addedIntermediates[p]=lineage;
 }
 for(const [p,h] of Object.entries(prior.added??{})){
  if(inPackage.has(p))continue;
  removed.add(p);
  addedIntermediates[p]=uniq([...asList(prior.addedIntermediates?.[p]),h]);
 }
 // Paths removed by an EARLIER rebaseline are in neither `before` nor
 // `added` any more; keep their authenticated lineage while they stay removed.
 for(const p of prior.removed??[]){
  if(p in prior.before||p in (prior.added??{})||inPackage.has(p))continue;
  const lineage=uniq(asList(prior.addedIntermediates?.[p]));
  if(lineage.length)addedIntermediates[p]=lineage;
 }
 next={schemaVersion:2,basePackage:prior.basePackage,scope:prior.scope,
  generator:'scripts/production-rebaseline.mjs',packageFileCount:files.length,
  before:prior.before,after:sorted(after),intermediates:sorted(intermediates),
  added:sorted(added),addedIntermediates:sorted(addedIntermediates),removed:[...removed].sort()};
}else{
 const expectedModified={},lineage={...(prior.lineage??{})},retired=new Set(prior.retired??[]);
 for(const [p,h] of Object.entries(prior.expectedModified)){
  const now=hashOf(p);
  if(!now){retired.add(p);lineage[p]=uniq([...asList(lineage[p]),h.beforeSHA256,h.afterSHA256]);continue;}
  expectedModified[p]={beforeSHA256:h.beforeSHA256,afterSHA256:now};
  const keep=uniq([...asList(lineage[p]),h.afterSHA256],now,h.beforeSHA256);
  if(keep.length)lineage[p]=keep;else delete lineage[p];
 }
 const expectedAdded=[];
 for(const p of prior.expectedAdded){if(hashOf(p))expectedAdded.push(p);else retired.add(p);}
 for(const p of [...retired])if(hashOf(p))retired.delete(p);
 next={schemaVersion:2,baselineArchiveName:prior.baselineArchiveName,baselineArchiveSHA256:prior.baselineArchiveSHA256,
  generator:'scripts/production-rebaseline.mjs',approvedR3:prior.approvedR3,
  expectedModified:sorted(expectedModified),expectedAdded:expectedAdded.sort(),
  lineage:sorted(lineage),retired:[...retired].sort()};
}
writeFileSync(resolve(out),JSON.stringify(next,null,1)+'\n');
console.log(JSON.stringify({kind,out:resolve(out),
 ...(kind==='fulltree'?{tracked:Object.keys(next.before).length,kept:Object.keys(next.after).length,added:Object.keys(next.added).length,removed:next.removed.length}
  :{modified:Object.keys(next.expectedModified).length,added:next.expectedAdded.length,retired:next.retired.length})}));
