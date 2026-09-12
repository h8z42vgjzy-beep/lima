import { mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

export const extraSpaces = [
  { id: 'lernarchiv', name: 'Lernarchiv', description: 'Lernzettel, Zusammenfassungen und PDF-Dokumente.' },
  { id: 'wissenszone', name: 'Wissenszone', description: 'Eigene Erklärungen zu Wissenschaft, Natur und Technik.' },
  { id: 'bastellabor', name: 'Bastellabor', description: 'Projekte und Quellcode teilen. Fremder Code wird hier nicht ausgeführt.' },
  { id: 'faktencheck', name: 'Faktencheck', description: 'Behauptungen einordnen und Quellen im Text nennen.' },
];

export function createExtrasService({ dataDir, one, all, run, transact, now, postAccess }) {
  const directory = path.join(dataDir, 'documents');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return {
    list(user, space) {
      if (space && !extraSpaces.some(s => s.id === space)) throw [400, 'Ungültiger Extras-Bereich.'];
      const entries = all(`SELECT p.*,u.name,u.color FROM posts p JOIN users u ON u.id=p.user_id
        WHERE p.space!='feed' AND p.deleted=0 AND (?='' OR p.space=?)
        AND u.id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?)
        ORDER BY p.created DESC LIMIT 100`, space || '', space || '', user.id, user.id).map(p => ({
        ...p, document: one('SELECT id,original_name,bytes FROM documents WHERE post_id=?', p.id) || null,
      }));
      return { spaces: extraSpaces, entries };
    },
    create(user, fields, file) {
      if (!extraSpaces.some(s => s.id === fields.space)) throw [400, 'Bitte wähle einen Extras-Bereich.'];
      const title = String(fields.title || '').trim(), text = String(fields.body || '').trim();
      if (title.length < 3 || title.length > 100 || text.length < 3 || text.length > 8000) throw [400, 'Titel: 3–100 Zeichen; Beschreibung: 3–8.000 Zeichen.'];
      const category = one('SELECT * FROM categories WHERE id=?', Number(fields.category));
      if (!category) throw [400, 'Bitte wähle eine Kategorie.'];
      let name, mime;
      if (file) {
        if (fields.rights !== 'true') throw [400, 'Bitte bestätige die Rechte an der Datei.'];
        const ext = path.extname(file.name).toLowerCase();
        if (!['.pdf', '.txt', '.md', '.java', '.js', '.css', '.html', '.json'].includes(ext)) throw [400, 'Hier sind PDF, TXT, MD und Quellcode-Dateien erlaubt. Bilder, Musik und Videos gehören in den Feed.'];
        if (!file.data.length || file.data.length > 10 * 1024 ** 2) throw [413, 'Dokumente dürfen höchstens 10 MB groß sein.'];
        if (ext === '.pdf' && file.data.toString('ascii', 0, 5) !== '%PDF-') throw [400, 'Keine gültige PDF-Datei.'];
        if (ext !== '.pdf' && file.data.includes(0)) throw [400, 'Bitte nur Textdateien mit Quellcode hochladen, keine ausführbaren Programme.'];
        mime = ext === '.pdf' ? 'application/pdf' : 'text/plain; charset=utf-8';
        name = randomBytes(18).toString('hex') + ext;
      }
      try {
        return transact(() => {
          const id = Number(run('INSERT INTO posts(user_id,body,category,space,title,created) VALUES(?,?,?,?,?,?)', user.id, text, category.name, fields.space, title, now()).lastInsertRowid);
          if (file) {
            writeFileSync(path.join(directory, name), file.data, { mode: 0o600, flag: 'wx' });
            run('INSERT INTO documents(post_id,file_name,original_name,mime,bytes) VALUES(?,?,?,?,?)', id, name, path.basename(file.name).slice(0,150), mime, file.data.length);
          }
          return { id };
        });
      } catch (e) { if (name) { try { unlinkSync(path.join(directory, name)); } catch {} } throw e; }
    },
    download(user, id) {
      const d = one('SELECT * FROM documents WHERE id=?', id);
      if (!d) throw [404, 'Dokument nicht gefunden.'];
      postAccess(user.id, d.post_id);
      let content;
      try { content = readFileSync(path.join(directory, d.file_name)); } catch { throw [410, 'Dokument nicht mehr verfügbar.']; }
      return { ...d, content };
    },
  };
}
