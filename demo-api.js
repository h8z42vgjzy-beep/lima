const demoKey='feindschaft-offline-preview-v1';
const sampleNames=['Mila','Ben','Juno','Theo','Nika'];
const sampleColors=['pink','mint','lavender','yellow','blue'];
const sampleBodies=['Du bist der menschgewordene „Ich habe die AGB gelesen“-Haken.','Dein Zeitmanagement hat wahrscheinlich selbst die Deadline verpasst.','Du bist wie ein Softwareupdate. Niemand hat gefragt, aber jetzt dauert alles länger.','Deine To-do-Liste ist inzwischen historische Fiktion.','Du hast so viele Tabs offen, selbst dein Browser braucht einen Sitzkreis.'];
const demoDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function initialDemo(){return {version:2,profile:null,active:false,posts:sampleBodies.map((body,i)=>({id:i+1,user_id:i+1,name:sampleNames[i],color:sampleColors[i],body,category:['Alltag','Schule & Uni','Internet','Alltag','Internet'][i],created:Date.now()-(i+1)*17*60000,base:[128,96,84,67,52][i],demo:1})),comments:[{id:301,user_id:2,post_id:1,parent_id:null,body:'Immerhin ein Haken an meiner To-do-Liste.',created:Date.now()-300000,demo:1,base:8},{id:302,user_id:1,post_id:1,parent_id:301,body:'Du meinst deine Sammlung unverbindlicher Absichtserklärungen?',created:Date.now()-180000,demo:1,base:5},{id:303,user_id:3,post_id:2,parent_id:null,body:'Meine Deadline und ich haben eine offene Beziehung.',created:Date.now()-120000,demo:1,base:6},{id:304,user_id:5,post_id:1,parent_id:302,body:'Klingt schöner als „Ordner für später“.',created:Date.now()-60000,demo:1,base:3}],reactions:[],claims:[],saved:[],hidden:[],blocks:[]};}
let offline=initialDemo();
try{const data=JSON.parse(localStorage.getItem(demoKey));if(data&&[1,2].includes(data.version)&&Array.isArray(data.posts)&&Array.isArray(data.comments)&&Array.isArray(data.blocks)){offline={...initialDemo(),...data};if(data.version===1){offline.reactions=(data.liked||[]).map(id=>({voter:1000,kind:'post',target:id,owner:data.posts.find(p=>p.id===id)?.user_id,value:1}));offline.claims=[];}offline.version=2;}}catch{}
function persistDemo(){try{localStorage.setItem(demoKey,JSON.stringify(offline));}catch{}}
function demoUser(){if(!offline.active||!offline.profile)return null;const p=offline.profile;return {gender:'',queer:'',orientation:'',identityVisible:false,...p,plus:!!p.trialEnd&&p.trialEnd>Date.now(),trialUsed:!!p.trialEnd,balance:offline.claims.length*300+offline.reactions.filter(r=>r.owner===1000).reduce((a,r)=>a+(r.value===1?2:-5),0),canClaim:!offline.claims.includes(demoDay())};}
function demoIdentity(b){const gender=b.gender||'',queer=b.queer||'',orientation=b.orientation||'';if(!['','Frau','Mann','Nichtbinär','Agender','Genderfluid','Anders'].includes(gender)||!['','Ja','Nein','Noch offen'].includes(queer)||!['','Lesbisch','Schwul','Bisexuell','Pansexuell','Asexuell','Queer','Heterosexuell','Noch offen','Anders'].includes(orientation))throw Error('Bitte wähle eine gültige Profilangabe.');return {gender,queer,orientation,identityVisible:b.identityVisible===true};}
function demoPerson(id){if(id===1000)return offline.profile;return {id,name:sampleNames[id-1]||'Demo-Testprofil',color:sampleColors[id-1]||'blue',demo:true};}
function demoStats(kind,id){const rs=offline.reactions.filter(r=>r.kind===kind&&r.target===id);return {likes:rs.filter(r=>r.value===1).length,dislikes:rs.filter(r=>r.value===-1).length,vote:offline.active?(rs.find(r=>r.voter===1000)?.value||0):0};}
function demoComments(id){return offline.comments.filter(c=>c.post_id===id&&!offline.blocks.includes(c.user_id)).map(c=>{const p=demoPerson(c.user_id),r=demoStats('comment',c.id);return {...c,name:p?.name||'Demo',color:p?.color||'pink',...r,likes:r.likes+(c.base||0)};});}
function demoFeed(){const u=demoUser();return offline.posts.filter(p=>!offline.hidden.includes(p.id)&&!offline.blocks.includes(p.user_id)).map(p=>{const r=demoStats('post',p.id),c=demoComments(p.id);return {...p,...(p.user_id===1000&&offline.profile?{name:offline.profile.name,color:offline.profile.color}:{}),...r,likes:(p.base||0)+r.likes,flowers:(p.base||0)+r.likes,liked:r.vote===1,saved:!!u&&offline.saved.includes(p.id),comments:c.length,recentComments:c.filter(x=>x.created>Date.now()-86400000).length,lastDiscussion:c.at(-1)?.created||p.created,plus:p.user_id===1000&&!!u?.plus};});}
function setDemoReaction(voter,kind,target,owner,value){offline.reactions=offline.reactions.filter(r=>!(r.voter===voter&&r.kind===kind&&r.target===target));if(value!==0)offline.reactions.push({voter,kind,target,owner,value});persistDemo();}
async function api(route,data){
 const [name,query]=route.split('?');const q=new URLSearchParams(query||'');
 if(name==='me')return {user:demoUser()};
 if(name==='feed')return {posts:demoFeed(),members:offline.profile?1:0};
 if(name==='register'||name==='login'){
  const n=String(data?.name||'').trim();if(n.length<3||n.length>24||!/^[\p{L}\p{N}_-]+$/u.test(n))throw Error('Bitte wähle 3–24 Zeichen: Buchstaben, Zahlen, _ oder -.');
  if(data.consent!==true)throw Error('Bitte stimme den Spielregeln zu.');
  offline.profile={id:1000,name:n,color:'pink',trialEnd:offline.profile?.trialEnd||null,...demoIdentity(data)};offline.active=true;persistDemo();return {user:demoUser()};
 }
 const u=demoUser();if(!u)throw Error('Wähle zuerst einen Namen für dein lokales Demoprofil.');
 if(name==='logout'){offline.active=false;persistDemo();return {ok:true};}
 if(name==='daily'){const day=demoDay(),claimed=!offline.claims.includes(day);if(claimed)offline.claims.push(day);persistDemo();return {claimed,user:demoUser()};}
 if(name==='profile-update'){Object.assign(offline.profile,demoIdentity(data));persistDemo();return {user:demoUser()};}
 if(name==='people')return {people:[],requests:[]};
 if(name==='member'){const p=demoPerson(Number(q.get('id')));if(!p||offline.blocks.includes(p.id))throw Error('Profil nicht gefunden.');return {member:{id:p.id,name:p.name,color:p.color,demo:!!p.demo,gender:p.identityVisible?p.gender:'',queer:p.identityVisible?p.queer:'',orientation:p.identityVisible?p.orientation:''}};}
 if(name==='profile')return {user:u,flowers:offline.reactions.filter(r=>r.owner===1000&&r.value===1).length,posts:offline.posts.filter(p=>p.user_id===1000).length,blocks:offline.blocks.map(demoPerson)};
 if(name==='comments')return {comments:demoComments(Number(q.get('post')))};
 if(name==='post'){
  const content=String(data.body||'').trim();if(content.length<3||content.length>280)throw Error('Dein Spruch braucht 3–280 Zeichen.');
  const id=Math.max(...offline.posts.map(p=>p.id),0)+1;
  offline.posts.unshift({id,user_id:1000,name:u.name,color:u.color,body:content,category:['Alltag','Schule & Uni','Internet'].includes(data.category)?data.category:'Alltag',created:Date.now(),base:0,demo:0});persistDemo();return {id};
 }
 if(name==='react'){
  if(!['post','comment'].includes(data.kind)||![0,1,-1].includes(data.value))throw Error('Ungültige Bewertung.');
  const target=(data.kind==='post'?offline.posts:offline.comments).find(p=>p.id===Number(data.target));if(!target||offline.blocks.includes(target.user_id))throw Error('Beitrag nicht gefunden.');if(target.user_id===1000)throw Error('Eigene Beiträge kannst du nicht bewerten.');
  setDemoReaction(1000,data.kind,target.id,target.user_id,data.value);return demoStats(data.kind,target.id);
 }
 if(name==='demo-receive'){
  const target=offline.posts.find(p=>p.user_id===1000);if(!target)throw Error('Poste zuerst einen eigenen Testspruch.');if(![0,1,-1].includes(data.value))throw Error('Ungültige Auswahl.');
  setDemoReaction(2000,'post',target.id,1000,data.value);return {user:demoUser()};
 }
 if(name==='trial'){if(u.trialUsed)throw Error('Die Demo-Probephase wurde bereits gestartet.');offline.profile.trialEnd=Date.now()+7*86400000;persistDemo();return {user:demoUser()};}
 if(name==='block'||name==='unblock'){const id=Number(data.target);offline.blocks=offline.blocks.filter(x=>x!==id);if(name==='block')offline.blocks.push(id);persistDemo();return {ok:true};}
 if(['flower','save','hide','delete-post','comment'].includes(name)){
  const id=Number(data.post);const p=offline.posts.find(x=>x.id===id);if(!p)throw Error('Spruch nicht gefunden.');
  if(name==='delete-post'){if(p.user_id!==1000)throw Error('Du kannst nur eigene Sprüche löschen.');const ids=offline.comments.filter(c=>c.post_id===id).map(c=>c.id);offline.reactions=offline.reactions.filter(r=>!(r.kind==='post'&&r.target===id)&&!(r.kind==='comment'&&ids.includes(r.target)));offline.posts=offline.posts.filter(x=>x.id!==id);offline.comments=offline.comments.filter(c=>c.post_id!==id);persistDemo();return {ok:true};}
  if(name==='hide'){if(!offline.hidden.includes(id))offline.hidden.push(id);persistDemo();return {ok:true};}
  if(name==='comment'){const content=String(data.body||'').trim();if(!content||content.length>280)throw Error('Deine Antwort braucht 1–280 Zeichen.');const parent=data.parent==null?null:Number(data.parent);if(parent&&!offline.comments.some(c=>c.id===parent&&c.post_id===id&&!offline.blocks.includes(c.user_id)))throw Error('Kommentar nicht gefunden.');const cid=Math.max(...offline.comments.map(c=>c.id),0)+1;offline.comments.push({id:cid,post_id:id,parent_id:parent,user_id:1000,name:u.name,color:u.color,body:content,created:Date.now(),base:0});persistDemo();return {id:cid};}
  if(name==='flower'){if(p.user_id===1000)throw Error('Keine Likes für eigene Sprüche.');const value=demoStats('post',id).vote===1?0:1;setDemoReaction(1000,'post',id,p.user_id,value);return {active:value===1};}
  if(name==='save'&&!u.plus)throw Error('Starte die kostenlose Plus-Demo zum Speichern.');
  const active=!offline.saved.includes(id);offline.saved=offline.saved.filter(x=>x!==id);if(active)offline.saved.push(id);persistDemo();return {active};
 }
 throw Error('Echte Konten und persönliche Chats brauchen die veröffentlichte Online-Version.');
}
