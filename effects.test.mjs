import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');

test('Effects release wires every local asset and respects reduced-motion settings', () => {
  const html=read('public/index.html'),server=read('server.mjs'),css=read('public/action.css');
  assert.match(html,/name="f-release" content="7"/);
  for(const file of ['music-player.js','dino-client.js','discovery-effects.js','features.js','app.js']){
    assert.match(html,new RegExp(`src="/${file.replace('.','\\.')}"`));
    assert.match(server,new RegExp(`/${file.replace('.','\\.')}`));
  }
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.dino-flash\.near/);assert.match(css,/\.dino-flash\.win/);assert.match(css,/\.dino-stage\.dino-crash/);
});

test('Four discoveries have names, local-only progress and no wallet or API operations', () => {
  const script=read('public/discovery-effects.js');
  for(const id of ['flowers','bloom','comet','footer'])assert.match(script,new RegExp(`${id}:`));
  assert.match(script,/f_discoveries/);assert.match(script,/prefers-reduced-motion/);
  assert.doesNotMatch(script,/fetch\s*\(|api\s*\(|wallet|Beleidigungen/);
});

test('Dino client contains responsive effects for game events without deciding winners', () => {
  const script=read('public/dino-client.js');
  for(const effect of ['KNAPP!','KAKTUS!','DU GEWINNST!','GLEICHSTAND!'])assert.match(script,new RegExp(effect.replace('!','\\!')));
  assert.match(script,/data\.winner/);assert.doesNotMatch(script,/winner\s*=(?!=)/);
  assert.match(script,/this\.reduced/);assert.match(script,/this\.particles/);
});
