/* Translate interface nodes only. Posts, messages, names and uploaded text stay untouched. */
(()=>{'use strict';let language=['de','en','ru','uk'].includes(document.documentElement.lang)?document.documentElement.lang:'de',scheduled=false;const original=new WeakMap(),attributes=new WeakMap();
const skip='script,style,textarea,code,pre,.post-body,.extra-text,.extra-entry>h3,.comment-card>p,.message-body,.message time,.author-button,.account-name,.chat-heading h2,.dock-track,.audio-info>strong,.audio-info>span,.photo-watermark,.moderation-notice>p,.activity-notice>strong,.profile-name,[data-user-content]';
const patterns=[
 [/^Spiele öffnen · (\d+) offen$/,['Open games · {1} active','Открыть игры · активно {1}','Відкрити ігри · активних {1}']],
 [/^AUSZEICHNUNGEN · (\d+) \/ 7$/,['ACHIEVEMENTS · {1} / 7','ДОСТИЖЕНИЯ · {1} / 7','ДОСЯГНЕННЯ · {1} / 7']],
 [/^Deine Rückmeldung #(\d+) ist gespeichert\. Du findest ihren Status im Feedback-Bereich\.$/,['Your feedback #{1} is saved. Find its status in Feedback.','Отзыв #{1} сохранён. Его статус доступен в разделе отзывов.','Відгук #{1} збережено. Його статус доступний у розділі відгуків.']],
 [/^AUSZEICHNUNG FREIGESCHALTET(.*)$/,['ACHIEVEMENT UNLOCKED{1}','ДОСТИЖЕНИЕ ОТКРЫТО{1}','ДОСЯГНЕННЯ ВІДКРИТО{1}']],

 [/^vor (\d+) Min\.$/,['{1} min ago','{1} мин. назад','{1} хв тому']],
 [/^vor (\d+) Std\.$/,['{1} hours ago','{1} ч. назад','{1} год тому']],
 [/^(\d+) Sekunden verbleiben$/,['{1} seconds remaining','Осталось {1} секунд','Залишилося {1} секунд']],
 [/^Spiele · (\d+) offen$/,['Games · {1} open','Игры · открыто {1}','Ігри · відкрито {1}']],
 [/^Foto öffnen · ([\d.,]+) ✳$/,['Open photo · {1} ✳','Открыть фото · {1} ✳','Відкрити фото · {1} ✳']],
 [/^Einmal öffnen · ([\d.,]+) ✳$/,['Open once · {1} ✳','Открыть один раз · {1} ✳','Відкрити один раз · {1} ✳']],
 [/^Foto posten · ([\d.,]+) ✳$/,['Publish photo · {1} ✳','Опубликовать фото · {1} ✳','Опублікувати фото · {1} ✳']],
 [/^([\d.,]+) ✳ bezahlen & öffnen$/,['Pay {1} ✳ and open','Заплатить {1} ✳ и открыть','Сплатити {1} ✳ і відкрити']],
 [/^Dein Guthaben: ([\d.,-]+)\.$/,['Your balance: {1}.','Ваш баланс: {1}.','Ваш баланс: {1}.']],
 [/^([\d.,]+) ✳ gehen an (.+) · einmalig pro Person$/,['{1} ✳ go to {2} · once per person','{1} ✳ получает {2} · один раз на человека','{1} ✳ отримує {2} · один раз на людину']],
 [/^Dein Foto · andere öffnen für ([\d.,]+) ✳ · dein Anteil ([\d.,]+) ✳$/,['Your photo · opening costs {1} ✳ · your share {2} ✳','Ваше фото · открытие {1} ✳ · ваша доля {2} ✳','Ваше фото · відкриття {1} ✳ · ваша частка {2} ✳']],
 [/^Foto hochladen: ([\d.,]+) Beleidigungen\. Andere zahlen einmalig ([\d.,]+) zum Öffnen; du erhältst davon ([\d.,]+)\. Dein Guthaben: ([\d.,-]+)\.$/,['Upload: {1} Beleidigungen. Others pay {2} once to open; you receive {3}. Balance: {4}.','Загрузка: {1} Beleidigungen. Открытие стоит {2}, из них вы получаете {3}. Баланс: {4}.','Завантаження: {1} Beleidigungen. Відкриття коштує {2}, із них ви отримуєте {3}. Баланс: {4}.']],
 [/^Speicher: ([\d.,]+) MB von ([\d.,]+) MB\.$/,['Storage: {1} MB of {2} MB.','Память: {1} МБ из {2} МБ.','Пам’ять: {1} МБ із {2} МБ.']],
 [/^(.+) ist am Zug · ohne Zeitlimit\.$/,['{1} to move · no time limit.','Ход: {1} · без ограничения времени.','Хід: {1} · без обмеження часу.']],
 [/^Du: Weiß · (.+): Schwarz · dauerhaft gespeichert · Züge kostenlos$/,['You: White · {1}: Black · saved · moves free','Вы: белые · {1}: чёрные · сохранено · ходы бесплатны','Ви: білі · {1}: чорні · збережено · ходи безкоштовні']],
 [/^(.+): Weiß · Du: Schwarz · dauerhaft gespeichert · Züge kostenlos$/,['{1}: White · You: Black · saved · moves free','{1}: белые · Вы: чёрные · сохранено · ходы бесплатны','{1}: білі · Ви: чорні · збережено · ходи безкоштовні']],
 [/^([\d.,]+) Beleidigungen$/,['{1} Beleidigungen','{1} Beleidigungen','{1} Beleidigungen']],
 [/^Feld (\d+)$/,['Square {1}','Клетка {1}','Клітинка {1}']],
 [/^Dieses Feld braucht (\d+) bis (\d+) Zeichen\.$/,['This field needs {1} to {2} characters.','В этом поле нужно от {1} до {2} символов.','У цьому полі потрібно від {1} до {2} символів.']],
 [/^Diese Datei darf höchstens (\d+) MB groß sein\.$/,['Maximum file size: {1} MB.','Максимальный размер: {1} МБ.','Максимальний розмір: {1} МБ.']],
 [/^Foto veröffentlicht\. ([\d.,]+) Beleidigungen abgezogen\.$/,['Photo published. {1} Beleidigungen deducted.','Фото опубликовано. Списано {1} Beleidigungen.','Фото опубліковано. Списано {1} Beleidigungen.']],
 [/^Guthabenabzug: ([\d.,]+) % \(([\d.,]+) Beleidigungen\)\.$/,['Balance deduction: {1}% ({2} Beleidigungen).','Списание: {1}% ({2} Beleidigungen).','Списання: {1}% ({2} Beleidigungen).']],
];
function translate(value){if(language==='de')return String(value);const s=String(value),key=s.trim().replace(/\s+/g,' '),entry=globalThis.F_TRANSLATIONS?.[key],index=['en','ru','uk'].indexOf(language);if(index<0)return s;if(entry)return s.replace(s.trim(),entry[index]);for(const [pattern,values]of patterns){const match=key.match(pattern);if(match)return values[index].replace(/\{(\d+)\}/g,(_,n)=>match[Number(n)]||'');}return s;}
function visit(root){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){const parent=node.parentElement;if(!parent||parent.closest(skip))continue;let record=original.get(node);if(!record||node.nodeValue!==record.last)record={source:node.nodeValue,last:node.nodeValue};if(parent.tagName==='OPTION'&&!parent.hasAttribute('value'))parent.setAttribute('value',record.source.trim());const value=translate(record.source);if(node.nodeValue!==value)node.nodeValue=value;record.last=value;original.set(node,record);}
 for(const element of root.querySelectorAll('[placeholder],[aria-label],[title]')){if(element.closest(skip))continue;let records=attributes.get(element)||{};for(const key of ['placeholder','aria-label','title']){const current=element.getAttribute(key);if(current===null)continue;let record=records[key];if(!record||current!==record.last)record={source:current};const value=translate(record.source);if(current!==value)element.setAttribute(key,value);record.last=value;records[key]=record;}attributes.set(element,records);}}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;visit(document.body);});}
globalThis.fTranslate=translate;globalThis.fLocale={set(code){language=['de','en','ru','uk'].includes(code)?code:'de';document.documentElement.lang=language;schedule();},get:()=>language,refresh:schedule};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});schedule();
})();
