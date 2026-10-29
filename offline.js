(()=>{'use strict';const language=document.documentElement.lang,words={
 de:['Keine Verbindung. Dein Revier wartet.','Sobald du wieder online bist, geht’s weiter. Deine Chats, Spiele und Beiträge bleiben auf dem Server erhalten.','Erneut verbinden ↗'],
 en:['No connection. Your space is waiting.','Continue when you are online again. Your chats, games and posts are kept on the server.','Reconnect ↗'],
 ru:['Нет связи. Твоя территория подождёт.','Продолжай, когда связь вернётся. Чаты, игры и публикации сохранены на сервере.','Подключиться снова ↗'],
 uk:['Немає зв’язку. Твоя територія зачекає.','Продовжуй, коли зв’язок повернеться. Чати, ігри й дописи збережено на сервері.','З’єднатися знову ↗']};
 for(const [i,key]of ['title','copy','retry'].entries())document.querySelector('[data-offline="'+key+'"]').textContent=(words[language]||words.de)[i];
 addEventListener('online',()=>{document.querySelector('[data-offline=retry]').focus();});})();
