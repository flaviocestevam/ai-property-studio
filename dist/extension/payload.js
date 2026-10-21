// Capture the CRM fragment before the website router can replace it.
(() => {
 if(!/^\/[a-z]{3}\/associate\/[^/]+\/[^/]+\/?$/i.test(location.pathname))return;
 const match=location.hash.match(/(?:^#|&)aipropertycrm_v1=([^&]+)/);
 let data=null;
 if(match){try{const raw=atob(decodeURIComponent(match[1]));const parsed=JSON.parse(new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));if(parsed.project==='ai-property-crm'&&parsed.version===1&&typeof parsed.message==='string')data=parsed;}catch{}}
 globalThis.AIPropertyPayloadReady=(async()=>{
  try{
   const response=await chrome.runtime.sendMessage({type:data?'AI_PROPERTY_PAYLOAD_SAVE_V1':'AI_PROPERTY_PAYLOAD_GET_V1',...(data?{payload:data}:{})});
   if(data&&response?.saved){const hash=location.hash.slice(1).split('&').filter(part=>!part.startsWith('aipropertycrm_v1=')).join('&');history.replaceState(null,'',location.pathname+location.search+(hash?'#'+hash:''));}
   return data||response?.payload||null;
  }catch{return data;}
 })();
})();
