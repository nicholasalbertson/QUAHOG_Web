/** Shared, read-only helpers for the production preflight tools and the
 * baseline generator. Nothing here deploys, deletes or writes source. */
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';

/** Files the focused preflight requires to be byte-identical between the
 * package and the live tree (or an explicitly approved hash).
 * 2026-11-09: `src/earth/Vehicles.tsx` was replaced by
 * `src/earth/vehicleTypes.ts` on 2026-11-03 (Stream A); the list follows the
 * file so the gate does not block on a path the package no longer ships. */
export const PROTECTED_PATHS=[
 'package-lock.json','src/store.ts','src/input.ts','src/shared.ts',
 'src/actors/Car.tsx','src/earth/vehicleTypes.ts','src/world/Water.tsx',
 'src/world/MissionRunner.tsx','src/ui/PerfProbe.tsx','src/mobile/profile.ts'
];

export const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
/** A lineage entry may be one hash (legacy manifests) or a list of hashes. */
export const asList=v=>v==null?[]:Array.isArray(v)?v:[v];

const SKIP=new Set(['node_modules','dist','.git']);
/** Package file list: git-tracked files when the package is a checkout,
 * otherwise every file outside node_modules/dist/.git (extracted archive). */
export function listPackageFiles(root){
 if(existsSync(join(root,'.git'))){
  const r=spawnSync('git',['-C',root,'ls-files','-z'],{encoding:'utf8',maxBuffer:1<<28});
  if(r.status===0)return r.stdout.split('\0').filter(p=>p&&existsSync(join(root,p))).sort();
 }
 const out=[];
 const walk=rel=>{
  for(const e of readdirSync(join(root,rel),{withFileTypes:true})){
   if(!rel&&SKIP.has(e.name))continue;
   const p=rel?`${rel}/${e.name}`:e.name;
   if(e.isDirectory())walk(p);else if(e.isFile())out.push(p);
  }
 };
 walk('');
 return out.sort();
}

/** `--flag value` reader; returns undefined when absent or malformed. */
export function arg(name){
 const i=process.argv.indexOf(name);
 const v=i<0?undefined:process.argv[i+1];
 return v&&!v.startsWith('--')?v:undefined;
}
