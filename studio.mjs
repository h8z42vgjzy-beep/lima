// Product features from “Was wir wirklich umsetzen”, 29 October 2026.
// All awards and ranks use server records. No client-supplied scores are trusted.
export const achievementCatalog = [
  {id:'first-post',name:'Frisch verfeindet',description:'Deinen ersten Beitrag veröffentlicht.',icon:'bloom',goal:1,metric:'posts'},
  {id:'first-counter',name:'Der erste Treffer',description:'Einen Like für einen eigenen Konter erhalten.',icon:'target',goal:1,metric:'likedComments'},
  {id:'charming',name:'Charmante Katastrophe',description:'100 positive Reaktionen erhalten.',icon:'heart',goal:100,metric:'likes'},
  {id:'unstoppable',name:'Unaufhaltsam',description:'10 Duelle gewonnen.',icon:'bolt',goal:10,metric:'wins'},
  {id:'spoilsport',name:'Spielverderber',description:'25 Spiele gewonnen.',icon:'trophy',goal:25,metric:'wins'},
  {id:'dino-dominator',name:'Dino-Dominator',description:'1.000 Meter in einem abgeschlossenen Dino-Duell erreicht.',icon:'dino',goal:1000,metric:'dinoBest'},
  {id:'legend',name:'Legende der Feindschaft',description:'Alle sechs anderen Auszeichnungen freigeschaltet.',icon:'crown',goal:6,metric:'achievements'},
];
const themes=['night','pride','forest','ice'];
export function createStudio({db,one,all,run,transact,now,blocked,activity}) {
  db.exec(`CREATE TABLE IF NOT EXISTS earned_achievements(
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement TEXT NOT NULL,created INTEGER NOT NULL,seen_at INTEGER,
    PRIMARY KEY(user_id,achievement));
  CREATE TABLE IF NOT EXISTS studio_preferences(
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    leaderboard INTEGER NOT NULL DEFAULT 0,onboarding_step INTEGER NOT NULL DEFAULT 0,
    onboarding_done INTEGER NOT NULL DEFAULT 0,sound INTEGER NOT NULL DEFAULT 0,
    haptics INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS game_results(
    game_id INTEGER PRIMARY KEY,type TEXT NOT NULL,
    creator INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    winner INTEGER REFERENCES users(id) ON DELETE SET NULL,
    creator_score INTEGER NOT NULL DEFAULT 0,opponent_score INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS result_creator ON game_results(creator);
  CREATE INDEX IF NOT EXISTS result_opponent ON game_results(opponent);
  CREATE INDEX IF NOT EXISTS result_winner ON game_results(winner,type);
  CREATE TABLE IF NOT EXISTS community_feedback(
    id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',
    created INTEGER NOT NULL,updated INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS feedback_user ON community_feedback(user_id,id);
  CREATE TABLE IF NOT EXISTS studio_schema(version INTEGER PRIMARY KEY,created INTEGER NOT NULL);`);

  // Backfill is idempotent. A historical Dino run only counts if actually finished.
  function recordGame(g) {
    if(!g||g.status!=='finished')return;
    let state;try{state=typeof g.state==='string'?JSON.parse(g.state):g.state;}catch{return;}
    const score=id=>g.type==='dino-run'?Math.max(0,Math.floor((state?.players?.find(p=>p.id===id)?.distance||0)/10)):0;
    const inserted=run(`INSERT OR IGNORE INTO game_results(game_id,type,creator,opponent,winner,creator_score,opponent_score,created)
      VALUES(?,?,?,?,?,?,?,?)`,g.id,g.type,g.creator,g.opponent,g.winner||null,score(g.creator),score(g.opponent),g.updated||now());
    if(inserted.changes){reconcile(g.creator);reconcile(g.opponent);}
  }
  if(!one('SELECT 1 FROM studio_schema WHERE version=11')) {
    transact(()=>{for(const g of all("SELECT * FROM chat_games WHERE status='finished'"))recordGame(g);
      run('UPDATE posts SET expires=created+? WHERE deleted=0 AND expires-created BETWEEN ? AND ?',28*86400000,7*86400000-100,7*86400000+100);
      run('INSERT INTO studio_schema VALUES(11,?)',now());});
  }
  const preferences=uid=>({leaderboard:false,onboarding_step:0,onboarding_done:false,sound:false,haptics:false,
    ...Object.fromEntries(Object.entries(one('SELECT * FROM studio_preferences WHERE user_id=?',uid)||{})
      .filter(([k])=>k!=='user_id').map(([k,v])=>[k,k==='onboarding_step'?v:!!v]))});

  function metrics(uid) {
    const n=(q,...v)=>Number(one(q,...v)?.n||0);
    const results=one(`SELECT COUNT(*) AS played,SUM(winner=?) AS wins,
      SUM(type='chess' AND winner=?) AS chessWins,
      MAX(CASE WHEN creator=? THEN creator_score ELSE opponent_score END) AS dinoBest
      FROM game_results WHERE creator=? OR opponent=?`,uid,uid,uid,uid,uid);
    return {
      posts:n('SELECT COUNT(*) AS n FROM posts WHERE user_id=?',uid),
      activePosts:n('SELECT COUNT(*) AS n FROM posts WHERE user_id=? AND deleted=0 AND (expires IS NULL OR expires>?)',uid,now()),
      comments:n('SELECT COUNT(*) AS n FROM comments WHERE user_id=?',uid),
      likedComments:n("SELECT COUNT(DISTINCT target_id) AS n FROM reactions r JOIN users u ON u.id=r.user_id WHERE r.owner_id=? AND r.kind='comment' AND r.value=1 AND u.demo=0 AND r.user_id<>r.owner_id",uid),
      likes:n('SELECT COUNT(*) AS n FROM reactions r JOIN users u ON u.id=r.user_id WHERE r.owner_id=? AND r.value=1 AND u.demo=0 AND r.user_id<>r.owner_id',uid),
      played:Number(results?.played||0),wins:Number(results?.wins||0),chessWins:Number(results?.chessWins||0),dinoBest:Number(results?.dinoBest||0),
    };
  }
  function reconcile(uid) {
    const m=metrics(uid);
    for(const a of achievementCatalog.filter(a=>a.id!=='legend'))if(m[a.metric]>=a.goal)
      run('INSERT OR IGNORE INTO earned_achievements(user_id,achievement,created) VALUES(?,?,?)',uid,a.id,now());
    m.achievements=one("SELECT COUNT(*) AS n FROM earned_achievements WHERE user_id=? AND achievement<>'legend'",uid).n;
    if(m.achievements>=6)run("INSERT OR IGNORE INTO earned_achievements(user_id,achievement,created) VALUES(?,'legend',?)",uid,now());
    const earned=all('SELECT achievement,created,seen_at FROM earned_achievements WHERE user_id=?',uid);
    return {metrics:m,achievements:achievementCatalog.map(a=>{const e=earned.find(e=>e.achievement===a.id);return {...a,progress:Math.min(a.goal,m[a.metric]||0),unlocked:!!e,created:e?.created||null,seen_at:e?.seen_at||null};})};
  }
  function overview(user) {
    const data=reconcile(user.id);
    const games=all(`SELECT g.id,g.request_id,g.type,g.status,g.turn,g.updated,
      u.id AS personId,u.name AS name,u.color AS color FROM chat_games g JOIN users u
      ON u.id=CASE WHEN g.creator=? THEN g.opponent ELSE g.creator END
      JOIN requests q ON q.id=g.request_id
      WHERE (g.creator=? OR g.opponent=?) AND g.status IN('active','invited')
      AND q.status='accepted' AND (u.suspended_until IS NULL OR u.suspended_until<=?)
      ORDER BY g.updated DESC LIMIT 30`,user.id,user.id,user.id,now()).filter(g=>!blocked(user.id,g.personId));
    const notices=activity.list(user.id);
    const requests=all("SELECT id,sender,receiver,status FROM requests WHERE (sender=? OR receiver=?) AND status IN('accepted','pending')",user.id,user.id)
      .filter(r=>!blocked(r.sender,r.receiver));
    return {...data,preferences:preferences(user.id),games,
      unread:notices.filter(n=>!n.read_at).length,unreadMessages:notices.filter(n=>!n.read_at&&n.type==='messages').length,
      pendingRequests:requests.filter(r=>r.receiver===user.id&&r.status==='pending').length,
      chats:requests.filter(r=>r.status==='accepted').length,
      feedback:all('SELECT id,kind,body,status,created FROM community_feedback WHERE user_id=? ORDER BY id DESC LIMIT 10',user.id),
    };
  }
  function save(user,b) {
    const p=preferences(user.id);
    for(const k of ['leaderboard','sound','haptics','onboarding_done'])if(b[k]!==undefined){if(typeof b[k]!=='boolean')throw [400,'Ungültige Einstellung.'];p[k]=b[k];}
    if(b.onboarding_step!==undefined){if(!Number.isInteger(b.onboarding_step)||b.onboarding_step<0||b.onboarding_step>4)throw [400,'Ungültiger Schritt.'];p.onboarding_step=b.onboarding_step;}
    run(`INSERT INTO studio_preferences VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
      leaderboard=excluded.leaderboard,onboarding_step=excluded.onboarding_step,
      onboarding_done=excluded.onboarding_done,sound=excluded.sound,haptics=excluded.haptics`,
      user.id,p.leaderboard?1:0,p.onboarding_step,p.onboarding_done?1:0,p.sound?1:0,p.haptics?1:0);
    return p;
  }
  function leaderboard(user,kind='wins') {
    if(!['wins','dino','chess','likes'].includes(kind))throw [400,'Unbekannte Rangliste.'];
    const candidates=all(`SELECT u.id,u.name,u.color FROM users u JOIN studio_preferences p ON p.user_id=u.id
      WHERE p.leaderboard=1 AND u.demo=0 AND (u.suspended_until IS NULL OR u.suspended_until<=?)
      AND u.id NOT IN(SELECT target FROM blocks WHERE user_id=?)
      AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?)`,now(),user.id,user.id);
    const ranks=candidates.map(u=>{const m=metrics(u.id);return {...u,score:kind==='dino'?m.dinoBest:kind==='chess'?m.chessWins:kind==='likes'?m.likes:m.wins};})
      .filter(u=>u.score>0).sort((a,b)=>b.score-a.score||a.id-b.id);
    let rank=0,previous=null;
    ranks.forEach((u,i)=>{if(u.score!==previous)rank=i+1;u.rank=rank;previous=u.score;});
    return {kind,leaders:ranks.slice(0,50),own:ranks.find(u=>u.id===user.id)||null,participating:preferences(user.id).leaderboard};
  }
  function publicProfile(viewer,id) {
    const u=one('SELECT id FROM users WHERE id=? AND demo=0',id);
    if(!u||blocked(viewer.id,id))throw [404,'Profil nicht gefunden.'];
    const d=reconcile(id);return {achievements:d.achievements.filter(a=>a.unlocked).map(({id,name,icon,created})=>({id,name,icon,created})),
      ...(preferences(id).leaderboard?{stats:{wins:d.metrics.wins,dinoBest:d.metrics.dinoBest,chessWins:d.metrics.chessWins}}:{})};
  }
  function feedback(user,b) {
    if(!['bug','idea','game','music','other'].includes(b.kind))throw [400,'Bitte wähle eine Feedback-Art.'];
    const body=typeof b.body==='string'?b.body.trim():'';
    if(body.length<10||body.length>1200)throw [400,'Dein Feedback braucht 10 bis 1200 Zeichen.'];
    if(one('SELECT COUNT(*) AS n FROM community_feedback WHERE user_id=? AND created>?',user.id,now()-86400000).n>=5)throw [429,'Du kannst fünf Rückmeldungen pro Tag senden.'];
    const duplicate=one('SELECT id FROM community_feedback WHERE user_id=? AND body=? AND kind=? AND created>?',user.id,body,b.kind,now()-60000);
    if(duplicate)return {id:duplicate.id,repeated:true};
    const t=now(),r=run('INSERT INTO community_feedback(user_id,kind,body,created,updated) VALUES(?,?,?,?,?)',user.id,b.kind,body,t,t);
    return {id:Number(r.lastInsertRowid)};
  }
  function adminFeedback(user,b) {
    if(!user.is_admin)throw [403,'Nur für die Moderation.'];
    if(b){if(!Number.isSafeInteger(b.id)||!['new','planned','done','closed'].includes(b.status))throw [400,'Ungültige Auswahl.'];
      if(!run('UPDATE community_feedback SET status=?,updated=? WHERE id=?',b.status,now(),b.id).changes)throw [404,'Feedback nicht gefunden.'];}
    return {feedback:all('SELECT f.*,u.name FROM community_feedback f JOIN users u ON u.id=f.user_id ORDER BY f.id DESC LIMIT 100')};
  }
  function acknowledge(user,b){if(!Array.isArray(b.ids)||b.ids.length>7||b.ids.some(id=>!achievementCatalog.some(a=>a.id===id)))throw [400,'Ungültige Auszeichnung.'];
    for(const id of b.ids)run('UPDATE earned_achievements SET seen_at=? WHERE user_id=? AND achievement=? AND seen_at IS NULL',now(),user.id,id);return {ok:true};}
  return {recordGame,overview,save,leaderboard,publicProfile,feedback,adminFeedback,acknowledge,reconcile,preferences,themes};
}
