// Shared active timeline; new connections join only while the event is running.
export const RESET_DURATION_MS = 136000;
export const RESET_LEAD_MS = 3000;
export function createResetService({all,one,run,transact,now,storageInfo,removeMedia,cleanupExpired,reportAllowsMedia}) {
  const clients=new Set();
  let lastResetAt=-Infinity;
  function current(){
    const event=one('SELECT * FROM reset_events WHERE ends>? ORDER BY id DESC LIMIT 1',now());
    return event?{id:event.id,created:event.created,startAt:event.created+RESET_LEAD_MS,ends:event.ends,preview:!!event.preview,serverNow:now()}:null;
  }
  function publish(event){
    const packet=`event: feed-reset\ndata: ${JSON.stringify(event)}\n\n`;
    for(const client of clients)if(!client.destroyed&&!client.writableEnded)client.write(`event: feed-reset\ndata: ${JSON.stringify({...event,canClose:client.resetCanClose})}\n\n`);
  }
  function preview(){
    const running=current();if(running)return running;
    const created=now(),ends=created+RESET_LEAD_MS+RESET_DURATION_MS;
    const result=run('INSERT INTO reset_events(created,ends,preview) VALUES(?,?,1)',created,ends);
    const event={id:Number(result.lastInsertRowid),created,startAt:created+RESET_LEAD_MS,ends,preview:true,serverNow:created};
    publish(event);return event;
  }
  function stream(req,res,actor=null) {
    res.resetCanClose=!!actor?.is_admin&&String(actor.name).toLowerCase()==='lima';
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(`event: ready\ndata: ${JSON.stringify({serverNow:now()})}\n\n`);
    clients.add(res);
    const active=current();if(active)res.write(`event: feed-reset\ndata: ${JSON.stringify({...active,canClose:res.resetCanClose})}\n\n`);
    const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),15000);heartbeat.unref?.();
    res.on('close',()=>{clearInterval(heartbeat);clients.delete(res);});
  }
  function plan(){
    const reports=all("SELECT * FROM reports WHERE status='open'");
    const media=all('SELECT * FROM media WHERE removed=0');
    const latest=new Set(all("SELECT id FROM posts WHERE space='feed' AND deleted=0 ORDER BY created DESC,id DESC LIMIT 100").map(p=>p.id));
    const feed=new Set(all("SELECT id FROM posts WHERE space='feed'").map(p=>p.id));
    const protectedMedia=new Set(media.filter(m=>!feed.has(m.post_id)||latest.has(m.post_id)||reports.some(r=>reportAllowsMedia(r,m))).map(m=>m.id));
    const protectedPosts=new Set([...latest,...media.filter(m=>protectedMedia.has(m.id)&&m.post_id).map(m=>m.post_id)]);
    for(const report of reports){
      if(report.target_type==='post')protectedPosts.add(report.target_id);
      if(report.target_type==='comment'){
        const post=one('SELECT post_id FROM comments WHERE id=?',report.target_id);if(post)protectedPosts.add(post.post_id);
      }
      if(report.target_type==='user')for(const post of all("SELECT id FROM posts WHERE user_id=? AND space='feed'",report.target_id))protectedPosts.add(post.id);
    }
    const disposable=media.filter(m=>!protectedMedia.has(m.id));
    // Permanent documents and protected evidence cannot cause an endless reset loop.
    const posts=all("SELECT id FROM posts WHERE space='feed' AND deleted=0").filter(p=>!protectedPosts.has(p.id));
    return {disposable,posts};
  }
  function reclaimableBytes(){return plan().disposable.reduce((sum,m)=>sum+m.bytes,0);}
  function check(incomingBytes=0) {
    cleanupExpired();
    const storage=storageInfo();
    const full=storage.used+incomingBytes>=storage.total;
    const diskFull=storage.available!==null&&storage.available!==undefined&&storage.available<incomingBytes+16*1024**2;
    if(!storage.total||(!full&&!diskFull)||current()||now()-lastResetAt<RESET_DURATION_MS+RESET_LEAD_MS)return null;
    const {disposable,posts}=plan();
    if(!disposable.length&&!posts.length)return null;
    for(const item of disposable)removeMedia(item);
    const created=now(),startAt=created+RESET_LEAD_MS,ends=startAt+RESET_DURATION_MS;
    const event=transact(()=>{
      for(const post of posts)run('UPDATE posts SET deleted=1 WHERE id=?',post.id);
      const result=run('INSERT INTO reset_events(created,ends) VALUES(?,?)',created,ends);
      return {id:Number(result.lastInsertRowid),created,startAt,ends,serverNow:created};
    });
    lastResetAt=created;
    publish(event);
    return event;
  }
  return {stream,check,preview,current,reclaimableBytes};
}
