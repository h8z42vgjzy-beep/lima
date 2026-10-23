// Targeted repair: blocking suspends access without overwriting chat consent.
// Existing declined requests can be resent once per week without another fee.
export function handleChatRepair({route,user,b,idField,one,run,transact,rate,blocked,debit,now}) {
 const target=idField(b,'target');
 if(target===user.id||!one('SELECT id FROM users WHERE id=?',target))throw [400,'Ungültige Person.'];
 if(route==='block'){
  run('INSERT OR IGNORE INTO blocks(user_id,target) VALUES(?,?)',user.id,target);
  return {status:200,data:{ok:true}};
 }
 if(route==='unblock'){
  run('DELETE FROM blocks WHERE user_id=? AND target=?',user.id,target);
  return {status:200,data:{ok:true}};
 }
 rate('request:'+user.id,6);
 if(!one('SELECT id FROM users WHERE id=? AND demo=0',target)||blocked(user.id,target))throw [400,'Diese Chat-Anfrage ist nicht möglich.'];
 return transact(()=>{
  const old=one(`SELECT * FROM requests WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)
   ORDER BY CASE status WHEN 'accepted' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
   CASE WHEN sender=? THEN 0 ELSE 1 END,id LIMIT 1`,user.id,target,target,user.id,user.id);
  if(old){
   if(['accepted','pending'].includes(old.status))return {status:200,data:{ok:true,request:old.id,status:old.status,alreadyExists:true,charged:0}};
   if(old.status!=='declined')throw [409,'Diese Chat-Anfrage ist nicht möglich.'];
   // Keeping the request ID preserves the existing messages and game references.
   // Declined records do not prove consent, so require the recipient to accept.
   run('CREATE TABLE IF NOT EXISTS chat_request_retries(request_id INTEGER PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE,last_sent INTEGER NOT NULL)');
   const retry=one('SELECT last_sent FROM chat_request_retries WHERE request_id=?',old.id);
   if(retry&&retry.last_sent>now()-7*86400000)throw [429,'Eine erneute Anfrage ist erst nach sieben Tagen möglich.'];
   run("UPDATE requests SET sender=?,receiver=?,status='pending',created=? WHERE id=?",user.id,target,now(),old.id);
   run('INSERT INTO chat_request_retries VALUES(?,?) ON CONFLICT(request_id) DO UPDATE SET last_sent=excluded.last_sent',old.id,now());
   return {status:201,data:{ok:true,request:old.id,status:'pending',recovered:true,charged:0}};
  }
  debit(user.id,200,'request:'+user.id+':'+target,'Chat-Anfrage gesendet',b.expectedCost);
  const id=Number(run('INSERT INTO requests(sender,receiver,created) VALUES(?,?,?)',user.id,target,now()).lastInsertRowid);
  return {status:201,data:{ok:true,request:id,status:'pending',charged:200}};
 });
}
