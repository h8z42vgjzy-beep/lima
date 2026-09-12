import path from 'node:path';

const types = {
  '.jpg': ['image', 'image/jpeg'], '.jpeg': ['image', 'image/jpeg'],
  '.png': ['image', 'image/png'], '.webp': ['image', 'image/webp'],
  '.mp3': ['audio', 'audio/mpeg'], '.m4a': ['audio', 'audio/mp4'],
  '.ogg': ['audio', 'audio/ogg'], '.wav': ['audio', 'audio/wav'],
  '.mp4': ['video', 'video/mp4'], '.webm': ['video', 'video/webm'],
};

export function validateMedia(file) {
  const ext = path.extname(file.name).toLowerCase(), type = types[ext];
  if (!type) throw [400, 'Erlaubt sind JPG, PNG, WebP, MP3, M4A, OGG, WAV, MP4 und WebM.'];
  const [kind, mime] = type, b = file.data;
  const max = kind === 'image' ? 10 : kind === 'audio' ? 25 : 100;
  if (!b.length || b.length > max * 1024 ** 2) throw [413, `Die Datei muss Inhalt haben und darf höchstens ${max} MB groß sein.`];
  // Do not trust the browser's file extension or Content-Type alone.
  let valid = false;
  if (mime === 'image/png') valid = b.length >= 45 && b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && b.toString('ascii', 12, 16) === 'IHDR' && b.readUInt32BE(16) > 0 && b.readUInt32BE(20) > 0 && b.includes(Buffer.from('IDAT')) && b.toString('ascii', b.length - 8, b.length - 4) === 'IEND';
  if (mime === 'image/jpeg') valid = b.length >= 10 && b[0] === 255 && b[1] === 216 && b[2] === 255 && b.lastIndexOf(Buffer.from([255, 217])) >= b.length - 32;
  if (mime === 'image/webp') valid = b.length >= 20 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && b.readUInt32LE(4) + 8 === b.length;
  if (mime === 'audio/mpeg') valid = b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 255 && (b[1] & 224) === 224);
  if (mime === 'audio/ogg') valid = b.toString('ascii', 0, 4) === 'OggS';
  if (mime === 'audio/wav') valid = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE';
  if (mime === 'video/mp4' || mime === 'audio/mp4') valid = b.length >= 16 && b.toString('ascii', 4, 8) === 'ftyp';
  if (mime === 'video/webm') valid = b.length > 20 && b.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
  if (!valid) throw [400, 'Datei beschädigt oder falsches Format. Bitte exportiere sie erneut im erlaubten Format.'];
  return { kind, mime };
}
