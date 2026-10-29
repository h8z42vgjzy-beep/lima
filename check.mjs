import {readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let count=0;
function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){if(['node_modules','data','.git','qa-results'].includes(item.name))continue;const file=path.join(dir,item.name);if(item.isDirectory())scan(file);else if(/\.(?:m?js)$/.test(item.name)){execFileSync(process.execPath,['--check',file],{stdio:'pipe'});count++;}}}
scan(root);console.log(count+' JavaScript modules parse successfully.');
