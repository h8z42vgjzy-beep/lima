/* Smaller photos before upload; visible media never trigger speculative downloads. */
(()=>{'use strict';
  async function prepare(file){
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size<240000)return file;
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=url;await image.decode();
      if(image.naturalWidth*image.naturalHeight>40000000)throw Error('Dieses Bild ist zu groß. Bitte auf höchstens 40 Megapixel verkleinern.');
      const scale=Math.min(1,2048/image.naturalWidth,2048/image.naturalHeight);
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');if(!context)return file;context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.87));
      if(!blob||blob.type!=='image/webp'||blob.size>=file.size)return file;
      return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp',lastModified:file.lastModified});
    }finally{URL.revokeObjectURL(url);}
  }
  const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){const video=entry.target;if(video.dataset.src){video.src=video.dataset.src;delete video.dataset.src;}observer.unobserve(video);}
  },{rootMargin:'300px'}):null;
  function scan(root=document){for(const video of root.querySelectorAll('video[data-src]'))if(observer)observer.observe(video);else{video.src=video.dataset.src;delete video.dataset.src;}}
  let pending=false;
  new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;scan();});}).observe(document.body,{childList:true,subtree:true});
  globalThis.fMedia={prepare,scan};scan();
})();
