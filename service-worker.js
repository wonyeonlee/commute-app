
const CACHE_NAME = "commute-app-v4";
const ASSETS = ["./","./index.html","./style.css","./app.js","./manifest.json","./logo.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,x));return r;}).catch(()=>caches.match("./index.html"))));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=new URL(e.notification.data?.url||"./",self.location.origin).href;
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list) if("focus" in c){c.navigate(url);return c.focus();}
    return clients.openWindow ? clients.openWindow(url) : undefined;
  }));
});
