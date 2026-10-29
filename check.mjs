import {readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let count=0;
function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){if(['node_modules','data','.git','qa-results'].includes(item.name))continue;const file=path.join(dir,item.name);if(item.isDirectory())scan(file);else if(/\.(?:m?js)$/.test(item.name)){execFileSync(process.execPath,['--check',file],{stdio:'pipe'});count++;}}}
scan(root);console.log(count+' JavaScript modules parse successfully.');

for(const name of ['night.webp','pride.webp','forest.webp','ice.webp','night.svg','pride.svg','forest.svg','ice.svg','dino.svg','chess.svg','arcade.svg']){
 if(!['public/art','public','art','.'].some(dir=>existsSync(path.join(root,dir,name))))throw Error('Bild fehlt im Upload: '+name+'. Bitte den vollständigen Ordner public/art hochladen.');
}
