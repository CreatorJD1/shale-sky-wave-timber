/** Explicit opt-in. Source patches do not silently replace the project's active route. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const studio=path.join(root,'src/components/puppet/Studio.tsx'),pkg=path.join(root,'package.json');
if(!fs.existsSync(studio)||!fs.existsSync(pkg))throw new Error('Extract into the existing project root first. The standalone HTML does not require this step.');
const original=fs.readFileSync(studio,'utf8'),p=JSON.parse(fs.readFileSync(pkg,'utf8'));
const active=original.includes('DriverFoundation as Studio');
const build='node scripts/build-driver.mjs',test='node --test tests/driver/core.test.mjs tests/driver/direction.test.mjs tests/driver/labels.test.mjs';
if(active&&p.scripts?.['driver:build']===build&&p.scripts?.['driver:test']===test){console.log('Screen-label-fixed foundation already active; no files changed.');process.exit(0);}
const backup=path.join(root,'driver-backup',new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(studio,path.join(backup,'Studio.tsx'));fs.copyFileSync(pkg,path.join(backup,'package.json'));
p.scripts={...p.scripts,'driver:build':build,'driver:test':test};
fs.writeFileSync(pkg,JSON.stringify(p,null,2)+'\n');
if(!active)fs.writeFileSync(studio,'export {DriverFoundation as Studio} from "./DriverFoundation";\n');
console.log(active?'Existing foundation route retained; regression-test hooks updated.':'Opt-in foundation route activated.');
console.log('Dependencies unchanged. Backup:',backup);
