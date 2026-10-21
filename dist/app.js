'use strict';
(async () => {
let durableStore=window.AIPropertyStateStore,storageWarning='';
try{if(durableStore)await durableStore.ready;}catch{durableStore=null;storageWarning='O armazenamento ampliado não abriu neste navegador. Baixe um backup antes de ampliar a base.';}
const migrateStorage=Boolean(durableStore&&!durableStore.getInitialState());let lastSave=Promise.resolve(true),lastAck='',saveFailed=false;
const KEY='ai-property-crm:state:v1';
const STATUSES={new:'Na fila',opened:'Aberto para revisão',sent:'Enviado',replied:'Respondeu',closed:'Encerrado'};
const LEGACY_MESSAGE=`Hello,

What if your next listing had an AI presenter introducing the property and walking buyers through its standout features?

At AI Property Studio, we create property videos featuring realistic AI presenters using your listing photos. Choose a presenter from our catalog and use the finished video in your property marketing, social media and digital ads.

You can see the presenters and video examples here:
https://ai-property-studio.flaviocostaestevam.chatgpt.site

Would you like a quote for one of your listings? Reply with the property link and I’ll send you the options.

Best,
Flavio
AI Property Studio`;
const DEFAULT_CAMPAIGN={firstName:'Flavio',lastName:'Cestevam',email:'',phone:'+55 67 9192-5533',company:'AI Property Studio',website:'https://bit.ly/ai-property-studio',subject:'See one of your listings presented by AI',message:`Hello,

I’d like to show you one of your listings with its own AI property presenter — introducing the home, highlighting its standout features and inviting buyers to get in touch.

At AI Property Studio, we turn your existing property photos into presenter-led videos for social media and digital advertising. You choose the presenter from our catalog; we create the video around your property.

If you’re interested, we can create a demonstration video using one of your listings, so you can see the result with a property you know before deciding to order.

See our presenters and video examples:
https://bit.ly/ai-property-studio

Which property would you like to see presented? Simply reply with the listing link, and we’ll prepare your demonstration.

Best,
Laissa
AI Property Studio`};
const seed={id:'dasara-zymeri',name:'Dasara Zymeri',url:'https://www.sothebysrealty.com/eng/associate/180-a-df240506071210843993/dasara-zymeri',region:'',status:'new',notes:'Perfil fornecido por você para o primeiro teste.',followup:'',createdAt:new Date().toISOString(),openedAt:'',sentAt:'',attempt:null};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;};
let state={project:'ai-property-crm',version:1,campaign:{...DEFAULT_CAMPAIGN},leads:[seed],history:[]};
let storageError='';
try{const stored=durableStore?.getInitialState();const raw=stored?null:localStorage.getItem(KEY);if(stored||raw){const saved=stored||JSON.parse(raw);validateState(saved);state=saved;}}catch(error){storageError='Não foi possível carregar os dados salvos. Preserve seu backup antes de continuar.';}
const copyUpdated=[LEGACY_MESSAGE,LEGACY_MESSAGE.replace('Best,\nFlavio','Best,\nLaissa')].includes(state.campaign.message);
if(copyUpdated){state.campaign.message=DEFAULT_CAMPAIGN.message;state.campaign.subject=DEFAULT_CAMPAIGN.subject;}
const previousPortfolio='https://ai-property-studio.flaviocostaestevam.chatgpt.site';
const linkUpdated=state.campaign.message.includes(previousPortfolio)||state.campaign.website===previousPortfolio;
if(linkUpdated){state.campaign.message=state.campaign.message.replaceAll(previousPortfolio,DEFAULT_CAMPAIGN.website);if(state.campaign.website===previousPortfolio)state.campaign.website=DEFAULT_CAMPAIGN.website;}
let editId=null,extensionReady=false,extensionCanCollect=false,extensionCanReset=false,resetInFlight=false,toastTimer,collectionTimer,collectorPending=false,collectionJob=null,contactsPage=1;
function profileKey(url){return new URL(canonical(url)).pathname.split('/')[3].toLowerCase();}
function ensureLeadNumbers(){
 let next=Number.isSafeInteger(state.nextLeadNumber)&&state.nextLeadNumber>0?state.nextLeadNumber:1,changed=false;
 for(const lead of state.leads)if(Number.isSafeInteger(lead.number)&&lead.number>0)next=Math.max(next,lead.number+1);
 const used=new Set();for(const lead of state.leads){if(!Number.isSafeInteger(lead.number)||lead.number<1||used.has(lead.number)){lead.number=next++;changed=true;}used.add(lead.number);}
 if(state.nextLeadNumber!==next){state.nextLeadNumber=next;changed=true;}return changed;
}
function resetCollector(){if(!state.collectionResetPending||!extensionCanReset||resetInFlight)return;resetInFlight=true;window.postMessage({type:'AI_PROPERTY_COLLECT_RESET_V1'},location.origin);setTimeout(()=>{resetInFlight=false;},12000);}
function collectorRequest(type){
 if(state.collectionResetPending){resetCollector();if(!extensionCanReset)toast('Contatos excluídos. Atualize a extensão para 1.4.0 para reiniciar a coleta.');return;}
 if(!extensionCanCollect){tab('extension');toast('Atualize a extensão para a versão 1.4.0 para coletar os contatos automaticamente.');return;}
 const checkpoint=state.collectionCheckpoint||{};
 const start=['AI_PROPERTY_COLLECT_START_V1','AI_PROPERTY_COLLECT_RESUME_V1'].includes(type);
 window.postMessage({type,runId:checkpoint.runId||'',offset:checkpoint.offset||0,limit:Number($('collectLimit').value)||100,...(start?{cursor:state.collectionProgress||null,knownIds:state.leads.map(lead=>profileKey(lead.url))}:{})},location.origin);
}
function collectorPoll(){clearTimeout(collectionTimer);if(!extensionCanCollect)return;collectorRequest('AI_PROPERTY_COLLECT_STATUS_V1');collectionTimer=setTimeout(collectorPoll,3000);}
function renderCollection(){
 const labels={running:'Coletando lote',paused:'Lote pausado',blocked:'Verificação solicitada pela Sotheby’s',error:'Lote interrompido',batch_complete:'Lote concluído',completed:'Sem próxima página identificada'};
 $('collectStatus').textContent=state.collectionResetPending?'Contatos excluídos · reinício da coleta pendente':collectionJob?`${labels[collectionJob.status]||'Coleta'} · ${collectionJob.total}/${collectionJob.limit||100} novos corretores`:'Coleta em lotes, na ordem do diretório.';
 $('collectReason').textContent=state.collectionResetPending?'Atualize e recarregue a extensão 1.4.0 para concluir o reinício do ponto de coleta.':collectionJob?.reason||'Selecione a quantidade. Cada lote continua do ponto salvo, sem repetir os perfis já cadastrados.';
 const partial=collectionJob&&['running','paused','blocked','error'].includes(collectionJob.status);
 if(partial)$('collectLimit').value=String(collectionJob.limit||100);
 $('collectLimit').disabled=Boolean(partial);
 $('collectStart').textContent=collectionJob?.status==='running'?'Coletando…':partial?'Retomar lote':`Coletar próximos ${Number($('collectLimit').value)||100}`;
 $('collectStart').disabled=collectorPending||collectionJob?.status==='running'||Boolean(collectionJob?.progress?.finished);
 $('collectPause').hidden=collectionJob?.status!=='running';
 const progress=collectionJob?.progress||state.collectionProgress;
 const resume=progress?.nextAgentId?`Retomada: página ${progress.pageNumber}, item ${Number(progress.nextIndex)+1}.`:`Retomada: ao final da página ${progress?.pageNumber||1}.`;
 $('collectCursor').textContent=progress?.lastAgent?`Último captado: ${progress.lastAgent.name} · Página ${progress.lastAgent.pageNumber} · ${resume}`:'Ponto de retomada: início do diretório.';
}
function acceptCollected(result){
 if(result.requestType==='AI_PROPERTY_COLLECT_RESET_V1'){resetInFlight=false;if(result.reset){state.collectionResetPending=false;collectionJob=null;lastAck='';persist();renderCollection();toast('Lista vazia. A próxima coleta começa no início do diretório.');}else toast(result.error||'Não foi possível reiniciar a coleta. Recarregue a extensão.');return;}
 if(state.collectionResetPending||(state.ignoredCollectionRuns||[]).includes(result.job?.runId))return;
 if(result.error){collectorPending=false;renderCollection();toast(result.error);return;}
 if(result.requestType==='AI_PROPERTY_COLLECT_ACK_V1')return;
 if(result.job!==undefined)collectionJob=result.job;
 const progressChanged=result.job?.progress&&JSON.stringify(state.collectionProgress)!==JSON.stringify(result.job.progress);
 if(progressChanged)state.collectionProgress=result.job.progress;
 if(Array.isArray(result.contacts)&&result.job){
   const known=new Set([...state.leads.map(lead=>profileKey(lead.url)),...(state.excludedProfileIds||[])]);let added=0;
   for(const row of result.contacts){
     try{
       const url=canonical(row.url),key=profileKey(url),source=new URL(row.sourceUrl);
       if(source.protocol!=='https:'||source.hostname!=='www.sothebysrealty.com'||!source.pathname.startsWith('/eng/associates/'))continue;
       if(known.has(key))continue;
       known.add(key);state.leads.push({id:uid(),url,name:String(row.name||inferredName(url)).slice(0,100),region:String(row.region||'').slice(0,160),status:'new',notes:`Captado automaticamente no diretório da Sotheby’s.\nFonte: ${source.toString()}`,sourceUrl:source.toString(),sourceKind:'directory_dom',locatedAt:row.locatedAt||new Date().toISOString(),createdAt:new Date().toISOString(),followup:'',openedAt:'',sentAt:'',attempt:null});added++;
     }catch{/* Ignore malformed or out-of-scope records without changing existing contacts. */}
   }
   if(result.nextOffset!==undefined){const previous=state.collectionCheckpoint;state.collectionCheckpoint={runId:result.job.runId,offset:result.nextOffset};if(saveFailed||added||progressChanged||previous?.runId!==result.job.runId||previous?.offset!==result.nextOffset)persist();}
   if(added)render();
   if(result.nextOffset<result.job.total)setTimeout(()=>collectorRequest('AI_PROPERTY_COLLECT_STATUS_V1'),100);
   const ackKey=result.job.runId+':'+result.nextOffset;
   if(lastAck!==ackKey){const runId=result.job.runId,offset=result.nextOffset;lastSave.then(saved=>{if(saved&&lastAck!==ackKey){lastAck=ackKey;window.postMessage({type:'AI_PROPERTY_COLLECT_ACK_V1',runId,offset},location.origin);}});}
 }
 collectorPending=false;renderCollection();
 if(result.requestType!=='AI_PROPERTY_COLLECT_STATUS_V1')collectorRequest('AI_PROPERTY_COLLECT_STATUS_V1');
}
function validateState(s){if(s?.project!=='ai-property-crm'||s.version!==1||!Array.isArray(s.leads)||!Array.isArray(s.history)||!s.campaign)throw Error('Backup incompatível.');if(s.leads.length>50000||s.history.length>100000)throw Error('Backup muito grande.');const ids=new Set(),urls=new Set();for(const l of s.leads){const url=canonical(l.url);if(typeof l.id!=='string'||typeof l.name!=='string'||!STATUSES[l.status]||ids.has(l.id)||urls.has(url))throw Error('Registro inválido ou duplicado.');ids.add(l.id);urls.add(url);}for(const h of s.history){if(typeof h.id!=='string'||typeof h.message!=='string'||typeof h.type!=='string'||typeof h.at!=='string')throw Error('Histórico inválido.');}for(const key of Object.keys(DEFAULT_CAMPAIGN)){if(typeof s.campaign[key]!=='string')throw Error('Configuração inválida.');}}
function persist(){if(storageError){toast(storageError);lastSave=Promise.resolve(false);return false;}ensureLeadNumbers();if(durableStore){lastSave=durableStore.save(state).then(()=>{saveFailed=false;return true;}).catch(()=>{saveFailed=true;toast('Não foi possível salvar os dados. Baixe um backup antes de continuar.');return false;});return true;}try{localStorage.setItem(KEY,JSON.stringify(state));saveFailed=false;lastSave=Promise.resolve(true);return true;}catch{saveFailed=true;lastSave=Promise.resolve(false);toast('Não foi possível salvar neste navegador. Baixe um backup agora.');return false;}}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
function canonical(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='www.sothebysrealty.com'||!/^\/[a-z]{3}\/associate\/[^/]+\/[^/]+\/?$/i.test(u.pathname))throw Error('Use o link completo de um perfil individual da Sotheby’s.');return 'https://www.sothebysrealty.com'+u.pathname.replace(/\/$/,'');}
function inferredName(url){return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop()).replace(/-/g,' ').replace(/\b\p{L}/gu,c=>c.toUpperCase());}
function date(value){return value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Sem contato';}
function tab(name){document.querySelectorAll('.tab').forEach(el=>el.hidden=el.id!==name);document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===name));const texts={contacts:['Sua próxima conversa começa aqui.','Organize os corretores, preencha o formulário e acompanhe cada contato.'],campaign:['Uma mensagem, todos os formulários.','Cadastre o remetente e a abordagem que será usada na prospecção.'],history:['Cada conversa tem uma história.','Consulte o texto registrado em cada abertura e em cada envio confirmado.'],extension:['Seu Chrome, pronto para prospectar.','Conecte a extensão exclusiva do AI Property CRM.']};$('pageTitle').textContent=texts[name][0];$('pageSubtitle').textContent=texts[name][1];}
function render(){if(ensureLeadNumbers())persist();$('deleteAll').disabled=!state.leads.length;$('deleteStatus').disabled=$('filter').value==='all'||!state.leads.some(l=>l.status===$('filter').value);$('deleteStatus').textContent=$('filter').value==='all'?'Excluir deste status':`Excluir de ${STATUSES[$('filter').value]}`;const leads=state.leads;$('total').textContent=leads.length;$('navCount').textContent=leads.length;$('pending').textContent=leads.filter(l=>l.status==='new'||l.status==='opened').length;$('sent').textContent=leads.filter(l=>l.sentAt).length;$('replied').textContent=leads.filter(l=>l.status==='replied').length;$('subjectPreview').textContent='Vídeos com apresentadores de IA';$('campaignStatus').textContent=state.campaign.email?`${state.campaign.firstName} ${state.campaign.lastName} · ${state.campaign.email} · Mensagem salva`:'Complete o email do remetente antes de começar.';
const query=$('search').value.toLocaleLowerCase();const filter=$('filter').value;const matched=leads.filter(l=>(filter==='all'||l.status===filter)&&`${l.name} ${l.region} ${l.url}`.toLocaleLowerCase().includes(query));const pages=Math.max(1,Math.ceil(matched.length/100));contactsPage=Math.max(1,Math.min(contactsPage,pages));const filtered=matched.slice((contactsPage-1)*100,contactsPage*100);$('contactsPagePrev').disabled=contactsPage===1;$('contactsPageNext').disabled=contactsPage===pages;$('contactsPageCount').textContent=`Página ${contactsPage} de ${pages}`;
$('rows').innerHTML=filtered.map(l=>`<tr><td class="leadNumberCell"><span class="leadNumber">${l.number}</span></td><td><a class="leadName" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)} ↗</a><span class="muted">${esc(l.region||'Sotheby’s International Realty')}</span></td><td><span class="badge ${l.status}">${STATUSES[l.status]}</span></td><td><span>${esc(date(l.sentAt||l.openedAt))}</span>${l.sentAt?'<br><span class="muted">Envio confirmado por você</span>':''}</td><td>${l.followup?esc(new Date(l.followup+'T12:00:00').toLocaleDateString('pt-BR')):'<span class="muted">—</span>'}</td><td><div class="rowActions">${!['sent','replied','closed'].includes(l.status)?`<button class="btn outline" data-action="open" data-id="${esc(l.id)}">Preencher e revisar ↗</button>`:''}${l.attempt&&!l.sentAt?`<button class="btn primary" data-action="confirm" data-id="${esc(l.id)}">Confirmar envio</button>`:''}<button class="textBtn" data-action="message" data-id="${esc(l.id)}">Mensagem</button><button class="textBtn" data-action="edit" data-id="${esc(l.id)}">Editar</button><button class="textBtn" data-action="delete" data-id="${esc(l.id)}">Excluir</button></div></td></tr>`).join('');$('empty').hidden=filtered.length>0;$('count').textContent=`${filtered.length} de ${leads.length} corretor${leads.length===1?'':'es'}`;renderHistory();}
function renderHistory(){$('historyList').innerHTML=state.history.length?state.history.slice().reverse().map(h=>`<article class="historyItem"><div><strong>${esc(h.name)}</strong> <span class="badge ${h.type==='sent'?'sent':'opened'}">${h.type==='sent'?'Envio confirmado':'Aberto para revisão'}</span><p>${esc(date(h.at))} · ${esc(h.email||'')}</p></div><button class="btn outline" data-history="${esc(h.id)}">Ver texto registrado</button></article>`).join(''):'<div class="empty"><strong>Nenhum contato registrado ainda.</strong><p>O histórico começa quando você abre um formulário pelo CRM.</p></div>';}
function fillCampaign(){const form=$('campaignForm');for(const key of Object.keys(DEFAULT_CAMPAIGN)){if(form.elements[key])form.elements[key].value=state.campaign[key];}messageLength();}
function messageLength(){$('messageLength').textContent=`${$('campaignForm').elements.message.value.length} caracteres · Mesmo texto para todos os corretores.`;}
function snapshot(){return {...state.campaign,name:`${state.campaign.firstName.trim()} ${state.campaign.lastName.trim()}`.trim()};}
function payloadUrl(lead,snap){const data={...snap,project:'ai-property-crm',version:1,leadId:lead.id,autoSubmit:false};let binary='';for(const n of new TextEncoder().encode(JSON.stringify(data)))binary+=String.fromCharCode(n);const url=new URL(canonical(lead.url));url.hash='aipropertycrm_v1='+encodeURIComponent(btoa(binary));return url.toString();}
function openLead(lead){if(!state.campaign.firstName.trim()||!state.campaign.lastName.trim()||!state.campaign.email.trim()||!state.campaign.message.trim()){tab('campaign');$('campaignForm').reportValidity();toast('Salve o nome, sobrenome, email e mensagem antes de continuar.');return;}if(!extensionReady){tab('extension');toast('Instale a extensão exclusiva e recarregue o CRM antes de preencher.');return;}if(['sent','replied','closed'].includes(lead.status)){toast('Este contato está fora da fila. Consulte o histórico para evitar repetição.');return;}const snap=snapshot();const popup=window.open(payloadUrl(lead,snap),'_blank');if(!popup){toast('O Chrome bloqueou a nova aba. Permita pop-ups para este CRM e tente novamente.');return;}try{popup.opener=null;}catch{}const at=new Date().toISOString();lead.attempt={...snap,at};lead.openedAt=at;lead.status='opened';state.history.push({...snap,id:uid(),leadId:lead.id,name:lead.name,url:lead.url,type:'opened',at});persist();render();toast('Perfil aberto. Abra o formulário, confira os campos e envie manualmente.');}
function review(lead,record){const snap=record||lead.attempt||snapshot();$('reviewTitle').textContent=`Mensagem · ${lead.name}`;$('reviewMeta').textContent=record?`${record.type==='sent'?'Envio confirmado':'Aberto para revisão'} em ${date(record.at)}`:lead.attempt?`Texto levado ao formulário em ${date(lead.attempt.at)}`:'Texto atual da campanha; ainda não aberto para este contato.';$('reviewSubject').value=snap.subject||'';$('reviewSubject').closest('label').hidden=true;$('reviewMessage').value=snap.message||'';$('reviewMessage').readOnly=Boolean(record)||!lead.attempt;if(!record&&lead.attempt&&!lead.sentAt)$('reviewMeta').textContent+=' · Se você editou a mensagem na Sotheby’s, atualize o texto abaixo antes de confirmar o envio.';$('reviewActions').replaceChildren();const copy=document.createElement('button');copy.className='btn outline';copy.textContent='Copiar mensagem';copy.onclick=()=>copyText($('reviewMessage').value);$('reviewActions').append(copy);if(!record&&lead.attempt&&!lead.sentAt){const send=document.createElement('button');send.className='btn primary';send.textContent='Já enviei — confirmar registro';send.onclick=()=>confirmSent(lead);$('reviewActions').append(send);}$('reviewDialog').showModal();}
function confirmSent(lead){if(!lead.attempt||lead.sentAt)return;const sentText=state.history.findLast(h=>h.leadId===lead.id&&h.type==='sent');if(sentText){toast('Este corretor já possui envio confirmado.');return;}if(!$('reviewDialog').open){review(lead);return;}const at=new Date().toISOString();state.history.push({...lead.attempt,id:uid(),leadId:lead.id,name:lead.name,url:lead.url,message:$('reviewMessage').value,type:'sent',at});lead.status='sent';lead.sentAt=at;persist();render();$('reviewDialog').close();toast('Envio registrado. O texto foi preservado no histórico.');}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Mensagem copiada. Isso não registra envio.');}catch{toast('Selecione o texto da mensagem e copie com Ctrl+C.');}}
function edit(lead){editId=lead?.id||null;$('leadTitle').textContent=lead?'Editar corretor':'Adicionar corretor';const form=$('leadForm');form.reset();for(const key of ['name','url','region','notes','followup'])form.elements[key].value=lead?.[key]||'';let sentOption=form.elements.status.querySelector('option[value=sent]');if(sentOption)sentOption.remove();if(lead?.sentAt){const opt=document.createElement('option');opt.value='sent';opt.textContent='Enviado';form.elements.status.append(opt);form.elements.status.querySelector('option[value=new]').disabled=true;form.elements.status.querySelector('option[value=opened]').disabled=true;}else{for(const opt of form.elements.status.options)opt.disabled=false;}form.elements.status.value=lead?.status||'new';$('leadDialog').showModal();}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function backup(){download(`ai-property-crm-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2),'application/json');}
$('campaignForm').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;for(const key of Object.keys(DEFAULT_CAMPAIGN))if(form.elements[key])state.campaign[key]=form.elements[key].value.trim();if(persist()){render();toast('Remetente e mensagem salvos.');}});$('campaignForm').elements.message.addEventListener('input',messageLength);
$('leadForm').addEventListener('submit',e=>{e.preventDefault();try{const form=e.currentTarget,url=canonical(form.elements.url.value);if(state.leads.some(l=>l.id!==editId&&profileKey(l.url)===profileKey(url))){toast('Este perfil já está cadastrado.');return;}const existing=state.leads.find(l=>l.id===editId);const lead={...(existing||{id:uid(),createdAt:new Date().toISOString(),openedAt:'',sentAt:'',attempt:null}),url,name:form.elements.name.value.trim(),region:form.elements.region.value.trim(),notes:form.elements.notes.value.trim(),followup:form.elements.followup.value,status:form.elements.status.value};if(!lead.name){toast('Informe o nome do corretor.');return;}if(existing){state.leads[state.leads.indexOf(existing)]=lead;}else state.leads.push(lead);persist();render();$('leadDialog').close();toast('Corretor salvo.');}catch(err){toast(err.message);}});
$('leadForm').elements.url.addEventListener('change',e=>{const form=$('leadForm');if(!form.elements.name.value){try{form.elements.name.value=inferredName(canonical(e.target.value));}catch{}}});
$('importForm').addEventListener('submit',e=>{e.preventDefault();let added=0,duplicates=0,invalid=0;const known=new Set(state.leads.map(l=>profileKey(l.url)));for(const row of $('importText').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean)){try{const parts=row.split('|').map(s=>s.trim());let name,url,region='';if(parts.length===1){url=canonical(parts[0]);name=inferredName(url);}else{[name,url,region='']=parts;url=canonical(url);name=name||inferredName(url);}if(known.has(profileKey(url))){duplicates++;continue;}known.add(profileKey(url));state.leads.push({id:uid(),name,url,region,status:'new',notes:'',followup:'',createdAt:new Date().toISOString(),openedAt:'',sentAt:'',attempt:null});added++;}catch{invalid++;}}persist();render();if(!invalid){$('importDialog').close();$('importText').value='';}toast(`${added} adicionados · ${duplicates} repetidos ignorados · ${invalid} linhas inválidas.`);});
async function deleteLeads(leads,reset=false){
 if(!leads.length&&!reset)return;
 const ids=new Set(leads.map(l=>l.id));
 const previous=JSON.parse(JSON.stringify(state));
 state.leads=state.leads.filter(l=>!ids.has(l.id));
 state.excludedProfileIds=[...new Set([...(state.excludedProfileIds||[]),...leads.map(l=>profileKey(l.url))])];
 if(reset){state.ignoredCollectionRuns=[...new Set([...(state.ignoredCollectionRuns||[]),collectionJob?.runId,state.collectionCheckpoint?.runId].filter(Boolean))];delete state.collectionCheckpoint;delete state.collectionProgress;state.collectionResetPending=true;state.nextLeadNumber=1;state.excludedProfileIds=[];collectionJob=null;lastAck='';}
 if(!persist()||!await lastSave){state=previous;render();toast('A exclusão não foi salva. Os contatos foram mantidos.');return;}
 contactsPage=1;render();renderCollection();if(reset)resetCollector();toast(reset?'Todos os contatos foram excluídos. Remetente, mensagem e histórico preservados.':`${leads.length} contato(s) excluído(s).`);
}
$('deleteAll').onclick=()=>{if(confirm(`Excluir todos os ${state.leads.length} contatos e reiniciar a coleta? O remetente, a mensagem e o histórico de envios serão preservados.`))return deleteLeads([...state.leads],true);};
$('deleteStatus').onclick=()=>{const status=$('filter').value;if(status==='all')return;const leads=state.leads.filter(l=>l.status===status);if(confirm(`Excluir os ${leads.length} contatos do status “${STATUSES[status]}”, em todas as páginas? O histórico de envios será preservado.`))return deleteLeads(leads);};
$('rows').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const lead=state.leads.find(l=>l.id===b.dataset.id);if(!lead)return;if(b.dataset.action==='open')openLead(lead);if(b.dataset.action==='edit')edit(lead);if(b.dataset.action==='message')review(lead);if(b.dataset.action==='confirm')review(lead);if(b.dataset.action==='delete'){if(confirm(`Excluir ${lead.name} da lista? O histórico de contatos será preservado.`)){return deleteLeads([lead]);}}});
$('historyList').addEventListener('click',e=>{const id=e.target.closest('[data-history]')?.dataset.history;if(!id)return;const record=state.history.find(h=>h.id===id);if(record)review({name:record.name},record);});
$('next').onclick=()=>{const lead=state.leads.find(l=>l.status==='new')||state.leads.find(l=>l.status==='opened');lead?openLead(lead):toast('Nenhum corretor pendente na fila.');};
$('addOpen').onclick=()=>edit();$('importOpen').onclick=()=>$('importDialog').showModal();$('search').oninput=()=>{contactsPage=1;render();};$('filter').onchange=()=>{contactsPage=1;render();};$('backup').onclick=backup;
$('contactsPagePrev').onclick=()=>{contactsPage--;render();};$('contactsPageNext').onclick=()=>{contactsPage++;render();};
$('collectStart').onclick=()=>{if(!extensionCanCollect){collectorRequest('AI_PROPERTY_COLLECT_START_V1');return;}collectorPending=true;renderCollection();collectorRequest(collectionJob&&['paused','blocked','error'].includes(collectionJob.status)?'AI_PROPERTY_COLLECT_RESUME_V1':'AI_PROPERTY_COLLECT_START_V1');setTimeout(()=>{if(collectorPending){collectorPending=false;renderCollection();toast('A extensão ainda não respondeu. Verifique se a versão 1.4.0 está ativa.');}},12000);};
$('collectPause').onclick=()=>collectorRequest('AI_PROPERTY_COLLECT_PAUSE_V1');
$('collectLimit').onchange=renderCollection;
$('exportCsv').onclick=()=>{const cell=s=>{let text=String(s??'');if(/^[=+@\-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};const rows=[['N°','Nome','Perfil','Região','Status','Aberto em','Enviado em','Próximo contato','Anotações','Última mensagem enviada'],...state.leads.map(l=>[l.number,l.name,l.url,l.region,STATUSES[l.status],l.openedAt,l.sentAt,l.followup,l.notes,state.history.findLast(h=>h.leadId===l.id&&h.type==='sent')?.message||''])];download('ai-property-crm-contatos.csv','\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');};
$('restore').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>134217728)throw Error('Backup maior que o limite de 128 MB.');const imported=JSON.parse(await file.text());validateState(imported);if(!confirm(`Restaurar ${imported.leads.length} corretores e ${imported.history.length} atividades? Isso substituirá os dados deste navegador. Baixe um backup antes, se necessário.`))return;state=imported;storageError='';if(persist()){fillCampaign();render();toast('Backup restaurado.');}}catch(err){toast('Não foi possível restaurar: '+err.message);}finally{e.target.value='';}});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>tab(b.dataset.go));document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin)return;if(event.data?.type==='AI_PROPERTY_CRM_READY_V1'){extensionReady=true;extensionCanReset=Boolean(event.data.canReset);if(state.collectionResetPending)resetCollector();$('connection').textContent='Extensão conectada';$('connection').classList.add('ready');if(event.data.canCollect&&!extensionCanCollect){extensionCanCollect=true;collectorPoll();}}if(event.data?.type==='AI_PROPERTY_COLLECT_RESULT_V1'&&extensionCanCollect)acceptCollected(event.data);});
const ping=()=>window.postMessage({type:'AI_PROPERTY_CRM_PING_V1'},location.origin);ping();setTimeout(ping,500);setTimeout(ping,1500);setTimeout(ping,3000);
window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue){try{const next=JSON.parse(event.newValue);validateState(next);state=next;render();fillCampaign();}catch{toast('Os dados mudaram em outra aba. Recarregue para conferir.');}}});
fillCampaign();render();renderCollection();if((copyUpdated||linkUpdated||migrateStorage)&&!storageError)persist();if(storageError||storageWarning)toast(storageError||storageWarning);
})();
