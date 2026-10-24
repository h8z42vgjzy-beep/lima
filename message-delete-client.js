(()=>{'use strict';
  const words={
    title:['Nachricht löschen','Delete message','Удалить сообщение','Видалити повідомлення'],
    self:['Nur für mich löschen','Delete for me','Удалить у меня','Видалити в мене'],
    everyone:['Für beide löschen','Delete for both','Удалить у обоих','Видалити в обох'],
    cancel:['Abbrechen','Cancel','Отмена','Скасувати'],
    own:['Du kannst deine Nachricht nur bei dir oder bei euch beiden entfernen.','Remove your message only for yourself or for both of you.','Вы можете удалить своё сообщение у себя или у вас обоих.','Ви можете видалити своє повідомлення в себе або у вас обох.'],
    received:['Diese Nachricht kannst du nur aus deiner eigenen Ansicht entfernen.','You can remove this message only from your own view.','Это сообщение можно удалить только из своего просмотра.','Це повідомлення можна видалити лише зі свого перегляду.'],
    note:['Bereits gelesene Inhalte und Bildschirmfotos lassen sich nicht zurückholen. Löschungen sind kostenlos; Versandkosten werden nicht erstattet.','Previously read content and screenshots cannot be taken back. Deletion is free; sending fees are not refunded.','Прочитанное и снимки экрана нельзя отозвать. Удаление бесплатно; плата за отправку не возвращается.','Прочитане та знімки екрана неможливо відкликати. Видалення безкоштовне; плата за надсилання не повертається.'],
    successSelf:['Nachricht für dich gelöscht.','Message deleted for you.','Сообщение удалено у вас.','Повідомлення видалено у вас.'],
    successEveryone:['Nachricht für beide gelöscht.','Message deleted for both.','Сообщение удалено у обоих.','Повідомлення видалено в обох.'],
    action:['Löschen','Delete','Удалить','Видалити']
  };
  const errors={
    'Ungültige Nachricht oder Löschoption.':['Invalid message or deletion option.','Неверное сообщение или вариант удаления.','Неправильне повідомлення або варіант видалення.'],
    'Nachricht nicht gefunden.':['Message not found.','Сообщение не найдено.','Повідомлення не знайдено.'],
    'Diese Löschfunktion ist nur für Textnachrichten.':['This deletion option is for text messages only.','Эта функция предназначена только для текстовых сообщений.','Ця функція призначена лише для текстових повідомлень.'],
    'Du kannst nur eigene Nachrichten für beide löschen.':['You can delete only your own messages for both.','Удалить у обоих можно только свои сообщения.','Видалити в обох можна лише власні повідомлення.']
  };
  Object.assign(globalThis.F_TRANSLATIONS||(globalThis.F_TRANSLATIONS={}),errors);
  const index=()=>Math.max(0,['de','en','ru','uk'].indexOf(globalThis.fLocale?.get()||document.documentElement.lang||'de'));
  const text=k=>words[k][index()];
  let current=null;
  function open(id,own){
    if(!user||!Number.isSafeInteger(id)||id<1)return;
    current?.close();
    const uid=user.id,request=chatId,dialog=document.createElement('dialog');current=dialog;
    dialog.className='message-delete-dialog';dialog.setAttribute('aria-labelledby','message-delete-title');
    const title=document.createElement('h2');title.id='message-delete-title';title.textContent=text('title');
    const intro=document.createElement('p');intro.textContent=text(own?'own':'received');
    const note=document.createElement('p');note.className='form-hint';note.textContent=text('note');
    const error=document.createElement('p');error.className='form-error';error.setAttribute('role','alert');
    dialog.append(title,intro,note,error);
    for(const scope of ['self',...(own?['everyone']:[]),'cancel']){
      const button=document.createElement('button');button.type='button';button.className='button full '+(scope==='everyone'?'dark':'outline');button.textContent=text(scope);
      button.onclick=async()=>{
        if(scope==='cancel'){dialog.close();return;}
        if(user?.id!==uid){dialog.close();return;}
        const buttons=dialog.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);error.textContent='';
        try{
          await api('message-delete',{message:id,scope});dialog.close();
          if(user?.id!==uid)return;
          toast(text(scope==='self'?'successSelf':'successEveryone'));
          if(chatId===request&&modalView==='chat')await loadMessages();
        }catch(e){if(dialog.isConnected)error.textContent=e.message;else if(user?.id===uid)toast(e.message);}
        finally{buttons.forEach(b=>b.disabled=false);}
      };
      dialog.append(button);
    }
    dialog.addEventListener('close',()=>{dialog.remove();if(current===dialog)current=null;},{once:true});
    document.body.append(dialog);dialog.showModal();
  }
  globalThis.fMessageDelete={open,label:()=>text('action')};
})();
