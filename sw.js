/* Tecla Stop: service worker.
   - Arquivos do próprio site: rede primeiro (deploy novo aparece na hora); sem rede em 2,5 s, usa a cópia guardada.
   - Scripts e fontes dos CDNs: cópia guardada primeiro (as versões são fixas).
   - Todo o resto (servidor de mesas do PeerJS etc.) passa direto.
   Assim o "Um celular só" abre sem internet depois da primeira visita. */
const VERSION="ts-v1";
const SHELL=["/","/index.html","/css/style.css","/js/temas.js","/js/base.js","/js/jogo.js","/js/tela.js","/js/cena.js","/js/rede.js",
  "/manifest.webmanifest","/icons/icon.svg","/icons/icon-192.png","/icons/icon-512.png","/icons/apple-touch-icon.png","/icons/icon-32.png"];
const CDN=["unpkg.com","cdnjs.cloudflare.com","fonts.googleapis.com","fonts.gstatic.com"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

function networkFirst(req){
  return new Promise(resolve=>{
    let done=false;
    const fromCache=()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==="navigate"?caches.match("/"):undefined));
    const timer=setTimeout(()=>{fromCache().then(r=>{if(r&&!done){done=true;resolve(r)}})},2500);
    fetch(req).then(res=>{
      if(res&&res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}
      if(!done){done=true;clearTimeout(timer);resolve(res)}
    }).catch(()=>{clearTimeout(timer);fromCache().then(r=>{if(!done){done=true;resolve(r||Response.error())}})});
  });
}
function cacheFirst(req){
  return caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    if(res&&(res.ok||res.type==="opaque")){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}
    return res;
  }));
}
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin)e.respondWith(networkFirst(req));
  else if(CDN.includes(url.hostname))e.respondWith(cacheFirst(req));
});
