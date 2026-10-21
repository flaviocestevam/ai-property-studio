(() => {
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    if(event.data?.type==='AI_PROPERTY_CRM_PING_V1'){
      window.postMessage({type:'AI_PROPERTY_CRM_READY_V1',version:'1.4.0',canCollect:true,canReset:true}, location.origin);return;
    }
    const allowed=['AI_PROPERTY_COLLECT_RESET_V1','AI_PROPERTY_COLLECT_START_V1','AI_PROPERTY_COLLECT_STATUS_V1','AI_PROPERTY_COLLECT_PAUSE_V1','AI_PROPERTY_COLLECT_RESUME_V1','AI_PROPERTY_COLLECT_ACK_V1'];
    if(!allowed.includes(event.data?.type))return;
    chrome.runtime.sendMessage({type:event.data.type,offset:event.data.offset,runId:event.data.runId,limit:event.data.limit,cursor:event.data.cursor,knownIds:event.data.knownIds},response=>{
      const error=chrome.runtime.lastError?.message;
      window.postMessage({type:'AI_PROPERTY_COLLECT_RESULT_V1',requestType:event.data.type,...(error?{error}:response)},location.origin);
    });
  });
})();
