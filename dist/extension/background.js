importScripts('collector-core.js');
const CRM='https://ai-property-crm.flaviocostaestevam.chatgpt.site';
const DIRECTORY='https://www.sothebysrealty.com/eng/associates/int/agent-last-name-high-sort';
const JOB_KEY='ai-property-crm:collector:v1', PROGRESS_KEY='ai-property-crm:directory-progress:v1';
const LIMITS=[10,50,100,200];
let serialized=Promise.resolve();
const trustedCrm=sender=>{try{return new URL(sender.url).origin===CRM;}catch{return false;}};
const fromDirectory=(sender,job)=>sender.tab?.id===job?.tabId&&Boolean(PropertyCollector.directoryUrl(sender.url));
const getJob=async()=> (await chrome.storage.local.get(JOB_KEY))[JOB_KEY]||null;
const getProgress=async()=> (await chrome.storage.local.get(PROGRESS_KEY))[PROGRESS_KEY]||null;
const saveJob=async job=>{await chrome.storage.local.set({[JOB_KEY]:job});return job;};
const summary=(job,progress)=>job?{runId:job.runId,status:job.status,pages:job.pages,total:job.contacts.length,limit:job.limit||100,reason:job.reason||'',updatedAt:job.updatedAt,progress:progress?{...progress,knownIds:undefined}:null}:null;
function restoreProgress(value){
 if(!value||!PropertyCollector.directoryUrl(value.pageUrl)||value.sourceUrl!==DIRECTORY)return null;
 return {sourceUrl:DIRECTORY,pageUrl:value.pageUrl,pageNumber:Math.max(1,Math.min(Number(value.pageNumber)||1,100000)),nextIndex:Math.max(0,Number(value.nextIndex)||0),nextAgentId:String(value.nextAgentId||'').slice(0,120),lastAgent:value.lastAgent&&PropertyCollector.profileUrl(value.lastAgent.url)?{name:String(value.lastAgent.name||'').slice(0,100),url:PropertyCollector.profileUrl(value.lastAgent.url).url,pageNumber:Number(value.lastAgent.pageNumber)||1}:null,knownIds:[],finished:Boolean(value.finished)};
}
async function sendScan(job){try{await chrome.tabs.sendMessage(job.tabId,{type:'AI_PROPERTY_DIRECTORY_SCAN_V1',runId:job.runId});}catch{/* The content script greets the worker when navigation finishes. */}}
async function openOrReuse(previous,progress){
 if(previous?.tabId){try{const tab=await chrome.tabs.get(previous.tabId);if(PropertyCollector.directoryUrl(tab.url)&&tab.url===progress.pageUrl)return {tabId:tab.id,seekPage:1,initialPageNumber:progress.pageNumber};}catch{}}
 const pageUrl=PropertyCollector.directoryUrl(progress.pageUrl)||DIRECTORY;
 const tab=await chrome.tabs.create({url:pageUrl,active:true});
 const needsSeek=pageUrl===DIRECTORY&&progress.pageNumber>1;
 return {tabId:tab.id,seekPage:needsSeek?progress.pageNumber:1,initialPageNumber:needsSeek?1:progress.pageNumber};
}
async function start(message){
 const previous=await getJob();let progress=await getProgress();
 if(previous?.status==='running')return {job:summary(previous,progress)};
 if(previous?.contacts?.length&&(previous.ackOffset||0)<previous.contacts.length)return {error:'Os contatos do lote anterior ainda estão sendo salvos no CRM. Aguarde a sincronização antes de iniciar outro lote.'};
 const limit=Number(message.limit||100);if(!LIMITS.includes(limit))return {error:'Selecione 10, 50, 100 ou 200 contatos.'};
 progress=progress||restoreProgress(message.cursor)||{sourceUrl:DIRECTORY,pageUrl:DIRECTORY,pageNumber:1,nextIndex:0,nextAgentId:'',lastAgent:null,knownIds:[],finished:false};
 if(progress.finished)return {job:summary(previous,progress),error:'O diretório chegou ao fim. O ponto final foi preservado.'};
 const ids=new Set(progress.knownIds||[]);for(const id of Array.isArray(message.knownIds)?message.knownIds:[])if(typeof id==='string'&&id.length<120)ids.add(id.toLowerCase());progress.knownIds=[...ids];
 const position=await openOrReuse(previous,progress);
 const job={runId:crypto.randomUUID(),...position,status:'running',limit,pages:0,contacts:[],visited:[],reason:'',acknowledged:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 await chrome.storage.local.set({[JOB_KEY]:job,[PROGRESS_KEY]:progress});await chrome.alarms.create('ai-property-collector-watch',{periodInMinutes:1});await sendScan(job);
 return {job:summary(job,progress)};
}
async function handle(message,sender){
 const type=message?.type;
 if(['AI_PROPERTY_PAYLOAD_SAVE_V1','AI_PROPERTY_PAYLOAD_GET_V1'].includes(type)){
  const profile=PropertyCollector.profileUrl(sender.url);
  if(!profile||!Number.isInteger(sender.tab?.id))return {error:'Origem de formulário não autorizada.'};
  const key='ai-property-crm:payload:'+sender.tab.id,cache=chrome.storage.session||chrome.storage.local;
  if(type==='AI_PROPERTY_PAYLOAD_SAVE_V1'){
   const payload=message.payload;if(payload?.project!=='ai-property-crm'||payload.version!==1||typeof payload.message!=='string'||payload.message.length>100000)return {error:'Dados de preenchimento inválidos.'};
   const clean={project:'ai-property-crm',version:1};for(const field of ['firstName','lastName','name','email','phone','company','website','subject','message','leadId'])if(typeof payload[field]==='string')clean[field]=payload[field];
   await cache.set({[key]:{profile:profile.key,payload:clean,expires:Date.now()+7200000}});return {saved:true};
  }
  const saved=(await cache.get(key))[key];return {payload:saved&&saved.profile===profile.key&&saved.expires>Date.now()?saved.payload:null};
 }

 if(type==='AI_PROPERTY_COLLECT_START_V1'&&trustedCrm(sender))return start(message);
 if(type==='AI_PROPERTY_COLLECT_RESET_V1'&&trustedCrm(sender)){await chrome.storage.local.set({[JOB_KEY]:null,[PROGRESS_KEY]:null});await chrome.alarms.clear('ai-property-collector-watch');return {reset:true,job:null,contacts:[],nextOffset:0};}
 const job=await getJob();let progress=await getProgress();
 if(type==='AI_PROPERTY_COLLECT_STATUS_V1'&&trustedCrm(sender)){
   const offset=job&&message.runId===job.runId?Math.max(0,Math.min(Number(message.offset)||0,job.contacts.length)):0;
   return {job:summary(job,progress),contacts:job?job.contacts.slice(offset,offset+200):[],offset,nextOffset:job?Math.min(offset+200,job.contacts.length):0};
 }
 if(type==='AI_PROPERTY_COLLECT_ACK_V1'&&trustedCrm(sender)){
   if(job&&message.runId===job.runId){job.ackOffset=Math.max(job.ackOffset||0,Math.min(Number(message.offset)||0,job.contacts.length));await saveJob(job);}return {acknowledged:true};
 }
 if(type==='AI_PROPERTY_COLLECT_PAUSE_V1'&&trustedCrm(sender)){
   if(job?.status==='running'){job.status='paused';job.reason='Lote pausado por você. O ponto de retomada foi salvo.';job.updatedAt=new Date().toISOString();await saveJob(job);}return {job:summary(job,progress)};
 }
 if(type==='AI_PROPERTY_COLLECT_RESUME_V1'&&trustedCrm(sender)){
   if(!job)return start(message);
   if(job.status==='running')return {job:summary(job,progress)};
   if(['batch_complete','completed'].includes(job.status))return start(message);
   const position=await openOrReuse(job,progress);Object.assign(job,position);
   job.status='running';job.reason='';job.updatedAt=new Date().toISOString();await saveJob(job);await sendScan(job);return {job:summary(job,progress)};
 }
 if(!job||!fromDirectory(sender,job))return {error:'Origem de coleta não autorizada.'};
 if(type==='AI_PROPERTY_DIRECTORY_HELLO_V1')return {runId:job.runId,status:job.status,initialPageNumber:job.initialPageNumber||1,seekPage:job.seekPage||1};
 if(message.runId!==job.runId)return {error:'Esta coleta já foi substituída.'};
 if(type==='AI_PROPERTY_DIRECTORY_NAVIGATE_V1'){if(job.status==='running'){job.initialPageNumber=Math.max(1,Number(message.nextPageNumber)||1);job.updatedAt=new Date().toISOString();await saveJob(job);}return {status:job.status};}
 if(type==='AI_PROPERTY_DIRECTORY_SEEK_V1'){if(job.status==='running'){job.updatedAt=new Date().toISOString();await saveJob(job);}return {status:job.status};}
 if(type==='AI_PROPERTY_DIRECTORY_PAGE_V1'){
   if(job.status!=='running')return {status:job.status};
   const source=PropertyCollector.directoryUrl(sender.url),known=new Set(progress.knownIds||[]);
   const pageNumber=Math.max(1,Number(message.pageNumber)||1);
   const rows=(Array.isArray(message.contacts)?message.contacts:[]).slice(0,10000).map(row=>({row,p:PropertyCollector.profileUrl(row.url)})).filter(item=>item.p);
   const signature=rows.map(item=>item.p.key).join('|');const pageKey=source+'|'+pageNumber;
   job.signatures=job.signatures||[];
   if(signature&&job.signatures.includes(signature)&&!job.visited.includes(pageKey)){job.status='paused';job.reason='A paginação voltou a uma lista já visitada. O ponto foi preservado para evitar um ciclo.';job.updatedAt=new Date().toISOString();await saveJob(job);return {status:job.status};}
   if(signature&&!job.signatures.includes(signature))job.signatures.push(signature);
   let nextIndex=rows.length;
   for(let i=0;i<rows.length;i++){
     const {row,p}=rows[i];if(known.has(p.key))continue;
     if(job.contacts.length>=job.limit){nextIndex=i;break;}
     known.add(p.key);const contact={url:p.url,name:String(row.name||PropertyCollector.nameFromSlug(p.slug)).slice(0,100),region:String(row.region||'').slice(0,160),sourceUrl:source,sourceKind:'directory_dom',locatedAt:new Date().toISOString()};
     job.contacts.push(contact);progress.lastAgent={name:contact.name,url:p.url,pageNumber};
   }
   if(!job.visited.includes(pageKey)){job.visited.push(pageKey);job.pages++;}
   Object.assign(progress,{pageUrl:source,pageNumber,nextIndex,nextAgentId:rows[nextIndex]?.p.key||'',knownIds:[...known]});
   job.initialPageNumber=pageNumber;job.seekPage=1;job.updatedAt=new Date().toISOString();
   if(job.contacts.length>=job.limit){job.status='batch_complete';job.reason=`Lote concluído: ${job.contacts.length} novos corretores. A próxima coleta continuará deste ponto.`;}
   await chrome.storage.local.set({[JOB_KEY]:job,[PROGRESS_KEY]:progress});return {status:job.status,pages:job.pages,total:job.contacts.length};
 }
 if(type==='AI_PROPERTY_DIRECTORY_STATE_V1'){
   if(job.status!=='running')return {status:job.status};
   if(!['completed','blocked','paused','error'].includes(message.status))return {error:'Estado inválido.'};
   job.status=message.status;job.reason=String(message.reason||'').slice(0,400);job.updatedAt=new Date().toISOString();
   await chrome.storage.local.set({[JOB_KEY]:job,[PROGRESS_KEY]:progress});return {job:summary(job,progress)};
 }
 return {status:job.status};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 serialized=serialized.then(()=>handle(message,sender)).then(result=>{respond(result);}).catch(error=>{respond({error:error.message||'Não foi possível executar a coleta.'});});return true;
});
chrome.tabs.onRemoved.addListener(id=>{const cache=chrome.storage.session||chrome.storage.local;cache.remove?.('ai-property-crm:payload:'+id).catch(()=>{});serialized=serialized.then(async()=>{const job=await getJob();if(job?.tabId===id&&job.status==='running'){job.status='paused';job.reason='A aba de coleta foi fechada. Seu ponto foi salvo; clique em Retomar.';job.updatedAt=new Date().toISOString();await saveJob(job);}}).catch(()=>{});});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name!=='ai-property-collector-watch')return;serialized=serialized.then(async()=>{const job=await getJob();if(!job||job.status!=='running'||Date.now()-new Date(job.updatedAt).getTime()<120000)return;job.status='paused';job.reason='A página parou de responder. O ponto foi salvo; clique em Retomar.';job.updatedAt=new Date().toISOString();await saveJob(job);}).catch(()=>{});});
