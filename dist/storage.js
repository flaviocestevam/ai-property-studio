// IndexedDB provides room for the complete directory and outreach history.
(() => {
 let db,initial=null,queue=Promise.resolve();
 const ready=new Promise((resolve,reject)=>{
   const request=indexedDB.open('ai-property-crm-v1',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('crm');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
     db=request.result;const read=db.transaction('crm','readonly').objectStore('crm').get('state');
     read.onsuccess=()=>{initial=read.result||null;resolve();};read.onerror=()=>reject(read.error);
   };
 });
 window.AIPropertyStateStore={ready,getInitialState:()=>initial,save(state){
   const snapshot=structuredClone(state);
   const write=()=>new Promise((resolve,reject)=>{const transaction=db.transaction('crm','readwrite');transaction.objectStore('crm').put(snapshot,'state');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});
   queue=queue.catch(()=>{}).then(write);return queue;
 }};
})();
