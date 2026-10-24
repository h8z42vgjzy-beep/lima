export function createMessageDeletion({db,one,run,transact,now,chatAccess}) {
  db.exec(`CREATE TABLE IF NOT EXISTS hidden_messages(
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created INTEGER NOT NULL, PRIMARY KEY(message_id,user_id));
    CREATE TABLE IF NOT EXISTS message_deletion_evidence(
    message_id INTEGER PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    body TEXT NOT NULL, expires INTEGER NOT NULL);`);
  const cleanup=()=>run('DELETE FROM message_deletion_evidence WHERE expires<=?',now());
  const timer=setInterval(cleanup,60000);timer.unref();cleanup();
  return {
    close(){clearInterval(timer);},cleanup,
    evidence(id){cleanup();return one('SELECT body FROM message_deletion_evidence WHERE message_id=? AND expires>?',id,now());},
    remove(user,b) {
      if(!user)throw [401,'Bitte melde dich an.'];
      if(!Number.isSafeInteger(b.message)||b.message<1||!['self','everyone'].includes(b.scope))throw [400,'Ungültige Nachricht oder Löschoption.'];
      return transact(()=>{
        const m=one('SELECT * FROM messages WHERE id=?',b.message);
        if(!m)throw [404,'Nachricht nicht gefunden.'];
        const chat=chatAccess(user,m.request_id);
        if(m.media_id!==null&&m.media_id!==undefined)throw [400,'Diese Löschfunktion ist nur für Textnachrichten.'];
        if(b.scope==='everyone'&&m.sender!==user.id)throw [403,'Du kannst nur eigene Nachrichten für beide löschen.'];
        if(m.deleted)return {ok:true,scope:b.scope,alreadyDeleted:true};
        if(b.scope==='self'){
          run('INSERT OR IGNORE INTO hidden_messages(message_id,user_id,created) VALUES(?,?,?)',m.id,user.id,now());
        } else {
          const other=chat.sender===m.sender?chat.receiver:chat.sender;
          const reported=one(`SELECT 1 FROM reports WHERE status='open' AND
            ((target_type='message' AND target_id=?) OR
             (target_type='user' AND target_id=? AND reporter=?)) LIMIT 1`,m.id,m.sender,other);
          if(reported)run('INSERT OR IGNORE INTO message_deletion_evidence VALUES(?,?,?)',m.id,m.body,now()+28*86400000);
          run("UPDATE messages SET deleted=1,body='' WHERE id=? AND sender=?",m.id,user.id);
        }
        return {ok:true,scope:b.scope};
      });
    }
  };
}
