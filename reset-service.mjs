// One live event for connected clients; no replay when a device reconnects.
export const RESET_DURATION_MS = 136000;
export const RESET_LEAD_MS = 3000;
export function createResetService({all,one,run,transact,now,storageInfo,removeMedia,cleanupExpired,reportAllowsMedia}) {
  const clients=new Set();
  let lastResetAt=-Infinity;
  function stream(req,res) {
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(`event: ready\ndata: ${JSON.stringify({serverNow:now()})}\n\n`);
    clients.add(res);
    const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),15000);heartbeat.unref?.();
    res.on('close',()=>{clearInterval(heartbeat);clients.delete(res);});
  }
  function check() {
    cleanupExpired();
    const storage=storageInfo();
    if(!storage.total||storage.used/storage.total<.85||now()-lastResetAt<RESET_DURATION_MS+RESET_LEAD_MS)return null;
    const reports=all("SELECT * FROM reports WHERE status='open'");
    const media=all('SELECT * FROM media WHERE removed=0');
    const protectedMedia=new Set(media.filter(m=>reports.some(r=>reportAllowsMedia(r,m))).map(m=>m.id));
    const protectedPosts=new Set(media.filter(m=>protectedMedia.has(m.id)&&m.post_id).map(m=>m.post_id));
    for(const report of reports){
      if(report.target_type==='post')protectedPosts.add(report.target_id);
      if(report.target_type==='comment'){
        const post=one('SELECT post_id FROM comments WHERE id=?',report.target_id);if(post)protectedPosts.add(post.post_id);
      }
      if(report.target_type==='user')for(const post of all("SELECT id FROM posts WHERE user_id=? AND space='feed'",report.target_id))protectedPosts.add(post.id);
    }
    const disposable=media.filter(m=>!protectedMedia.has(m.id));
    // Permanent documents and protected evidence cannot cause an endless reset loop.
    if(!disposable.length)return null;
    const posts=all("SELECT id FROM posts WHERE space='feed' AND deleted=0").filter(p=>!protectedPosts.has(p.id));
    for(const item of disposable)removeMedia(item);
    const created=now(),startAt=created+RESET_LEAD_MS,ends=startAt+RESET_DURATION_MS;
    const event=transact(()=>{
      for(const post of posts)run('UPDATE posts SET deleted=1 WHERE id=?',post.id);
      const result=run('INSERT INTO reset_events(created,ends) VALUES(?,?)',created,ends);
      return {id:Number(result.lastInsertRowid),created,startAt,ends,serverNow:created};
    });
    lastResetAt=created;
    const packet=`event: feed-reset\ndata: ${JSON.stringify(event)}\n\n`;
    for(const client of clients){if(!client.destroyed&&!client.writableEnded)client.write(packet);}
    return event;
  }
  return {stream,check};
}
