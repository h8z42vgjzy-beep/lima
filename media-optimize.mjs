import {mkdtemp,writeFile,readFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
let encoderPromise,encoding=false;
async function encoder(){return encoderPromise??= (async()=>{
  if(process.env.F_FFMPEG)return process.env.F_FFMPEG;
  try{return (await import('ffmpeg-static')).default;}catch{
    try{await execute('ffmpeg',['-version'],{timeout:3000,maxBuffer:16384});return 'ffmpeg';}catch{return null;}
  }
})();}

export async function optimizeMedia(file,kind) {
  if(encoding)throw [429,'Gerade wird eine Datei optimiert. Bitte versuche es gleich noch einmal.'];
  encoding=true;
  let temp;
  try {
    const originalBytes=file.data.length;
    if(kind==='image') {
      const sharp=(await import('sharp')).default;
      let data;
      try {data=await sharp(file.data,{limitInputPixels:40000000,failOn:'error'}).rotate()
        .resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:4}).toBuffer();}
      catch {throw [400,'Dieses Bild konnte nicht verarbeitet werden. Bitte exportiere es erneut als JPG, PNG oder WebP.'];}
      return {...file,data,name:file.name.replace(/\.[^.]+$/,'')+'.webp',mime:'image/webp',originalBytes};
    }
    const bin=await encoder();
    if(!bin)throw [503,'Die Medienoptimierung ist noch nicht bereit. Bitte die Installation auf dem Server prüfen.'];
    temp=await mkdtemp(path.join(tmpdir(),'feindschaft-media-'));await chmod(temp,0o700);
    const input=path.join(temp,'input'+path.extname(file.name).toLowerCase());
    await writeFile(input,file.data,{mode:0o600});
    let probe='';
    try{await execute(bin,['-hide_banner','-i',input],{timeout:12000,maxBuffer:65536});}catch(e){probe=e.stderr||'';}
    const duration=/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(probe);
    if(!duration)throw [400,'Die Mediendatei ist beschädigt oder hat keine lesbare Dauer.'];
    const seconds=+duration[1]*3600+(+duration[2])*60+(+duration[3]);
    if(kind==='video'&&seconds>180.05)throw [400,'Videos dürfen höchstens 3 Minuten lang sein.'];
    if(kind==='audio'&&seconds>3600)throw [400,'Musik darf höchstens eine Stunde lang sein.'];
    const ext=kind==='video'?'.mp4':'.mp3',output=path.join(temp,'output'+ext);
    const options=kind==='video'?['-map','0:v:0','-map','0:a:0?','-vf',"scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart']
      :['-map','0:a:0','-vn','-c:a','libmp3lame','-b:a','128k','-ar','44100'];
    await execute(bin,['-hide_banner','-loglevel','error','-nostdin','-y','-i',input,...options,'-map_metadata','-1','-threads','1',output],{timeout:120000,maxBuffer:65536});
    const data=await readFile(output);
    // Preserve already efficient supported media, avoiding generation loss and growth.
    if(data.length>=originalBytes)return {...file,originalBytes};
    return {...file,data,name:file.name.replace(/\.[^.]+$/,'')+ext,mime:kind==='video'?'video/mp4':'audio/mpeg',originalBytes};
  }catch(e){if(Array.isArray(e))throw e;if(e.code==='ERR_MODULE_NOT_FOUND')throw [503,'Die Bildoptimierung ist noch nicht installiert. Bitte den Build auf dem Server prüfen.'];
    throw [400,'Die Datei konnte nicht optimiert werden. Bitte exportiere sie erneut. Es wurde nichts abgebucht.'];
  }finally{encoding=false;if(temp)await rm(temp,{recursive:true,force:true});}
}
