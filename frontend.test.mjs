import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function ui(){
  const nodes=new Map();
  const element=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',innerHTML:'',textContent:'',files:[],hidden:false,open:false,dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},focus(){},scrollIntoView(){},close(){this.open=false;},showModal(){this.open=true;},setAttribute(){}});return nodes.get(selector);};
  const context=vm.createContext({document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},setInterval:()=>0,clearInterval(){},setTimeout:()=>0,clearTimeout(){},console,FormData,URL,Image:class{},HTMLImageElement:class{},fetch:async()=>({ok:true,json:async()=>({user:null,posts:[],categories:[],members:0})})});
  vm.runInContext(readFileSync(new URL('public/features.js',import.meta.url),'utf8'),context);
  const ready=vm.runInContext(readFileSync(new URL('public/app.js',import.meta.url),'utf8'),context);
  return {context,element,ready,run:code=>vm.runInContext(code,context)};
}

test('UI logic: no preselected category, choice preserved until submission, price displayed',async()=>{
  const h=ui();await h.ready;
  h.run("categories=[{id:1,name:'Alltag',photo_price:5},{id:2,name:'Kunst',photo_price:7}];updateCategories();");
  assert.equal(h.element('#post-category').value,'');
  assert.match(h.element('#post-category').innerHTML,/value="" disabled/);
  h.element('#post-category').value='2';h.run('updateCategories()');assert.equal(h.element('#post-category').value,'2');
  h.element('#post-file').files=[{name:'test.png'}];h.run('user={id:1,balance:300};updateUploadPrice()');
  assert.match(h.element('#upload-price').textContent,/hochladen: 7 Beleidigungen/);assert.match(h.element('#upload-price').textContent,/3,5/);
  h.element('#post-category').value='';h.run('updateUploadPrice()');assert.match(h.element('#upload-price').textContent,/Wähle eine Kategorie/);
});

test('UI logic: unlocked and owned photos render images, never a second buy button',async()=>{
  const h=ui();await h.ready;
  const locked=h.run("renderPostMedia({name:'Person',media:{id:3,kind:'image',open_price:5,unlocked:false}})");
  assert.match(locked,/data-action="unlock"/);assert.doesNotMatch(locked,/<img/);
  for(const owned of [true,false]){
    const html=h.run(`renderPostMedia({name:'Person',media:{id:3,kind:'image',open_price:5,unlocked:true,owned:${owned}}})`);
    assert.match(html,/<img src="\/media\/3"/);assert.match(html,/data-action="view-photo"/);assert.doesNotMatch(html,/data-action="unlock"/);
  }
  const attack=h.run(`renderPostMedia({name:'<script>bad</script>',media:{id:3,kind:'image',unlocked:true}})`);assert.doesNotMatch(attack,/<script>/);
});

test('UI wiring: mandatory category, media helpers load before app, games and extras reachable',()=>{
  const html=readFileSync(new URL('public/index.html',import.meta.url),'utf8');
  assert.match(html,/<select id="post-category"[^>]*required/);
  assert.ok(html.indexOf('src="/features.js"')<html.indexOf('src="/app.js"'));
  assert.match(html,/data-action="games"/);assert.match(html,/data-action="extras"/);
  assert.match(html,/Langzeit-Schach/);
  const features=readFileSync(new URL('public/features.js',import.meta.url),'utf8');
  assert.match(features,/data-action="chess-square"/);assert.match(features,/ohne Zeitlimit/);
  const css=readFileSync(new URL('public/features.css',import.meta.url),'utf8');
  assert.match(css,/grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-template-rows:repeat\(8,minmax\(0,1fr\)\)/);
  assert.match(css,/\.chess-square\{[^}]*min-width:0;min-height:0/);
  assert.match(css,/\.chess-square\.piece-white>span/);assert.match(css,/\.chess-square\.legal-target:after/);
  assert.match(features,/data-targets="\$\{targets\.join\(','\)\}"/);
});

test('Chess vectors have fixed opposite fills and distinct silhouettes',async()=>{
 const h=ui(); await h.ready;
 const silhouettes=new Set();
 for(const piece of ['K','Q','R','B','N','P']) {
   const white=h.run(`chessPieceSVG('${piece}')`),black=h.run(`chessPieceSVG('${piece.toLowerCase()}')`);
   assert.match(white,/fill="#fffaf0" stroke="#18202d"/);
   assert.match(black,/fill="#18202d" stroke="#fffaf0"/);
   assert.match(white,/<svg/);silhouettes.add(white);
 }
 assert.equal(silhouettes.size,6);
});

test('Chess result remains visible after finishing and alongside another active game',async()=>{
 const h=ui();await h.ready;
 h.run(`user={id:1};chatId=5;modalView='chat';chatPerson={name:'Test'};
 api=async()=>({catalog:[],games:[{id:8,type:'chess',creator:1,opponent:2,status:'finished',winner:1,version:5,state:{board:Array(64).fill(null)}}]});`);
 await h.run('loadChatGames()');
 assert.equal(h.element('#chat-games').hidden,false);
 assert.match(h.element('#chat-games').innerHTML,/Du hast gewonnen/);
 assert.match(h.element('#chat-games').innerHTML,/data-chess-board="8"/);
 assert.equal(h.run(`gamesForDisplay([{id:10,type:'dino-run',status:'active'},{id:8,type:'chess',status:'finished'}]).length`),2);
});

test('Promotion waits for a choice, submits chosen knight, and cancellation sends no move',async()=>{
 const h=ui();await h.ready;
 const board=h.element('[data-chess-board="9"]');
 board.dataset={from:'8',targets:'0'};
 board.querySelector=()=>({dataset:{piece:'P'}});
 h.run(`chatId=5;modalView='chat';globalThis.sent=[];
 api=async(route,data)=>{sent.push(data);};loadChatGames=async()=>{};
 choosePromotion=()=>new Promise(resolve=>{globalThis.resolvePromotion=resolve;});`);
 const pending=h.run(`chooseChessSquare({id:'9',version:'3',square:'0'})`);
 assert.equal(h.run('sent.length'),0);
 h.run("resolvePromotion('n')");await pending;
 assert.equal(h.run('sent[0].promotion'),'n');
 assert.equal(h.run('sent[0].from'),8);assert.equal(h.run('sent[0].to'),0);
 const cancelled=h.run(`chooseChessSquare({id:'9',version:'3',square:'0'})`);
 h.run('resolvePromotion(null)');await cancelled;
 assert.equal(h.run('sent.length'),1);
});
