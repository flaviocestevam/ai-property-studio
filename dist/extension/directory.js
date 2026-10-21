(() => {
 if(!PropertyCollector.directoryUrl(location.href))return;
 const send=data=>chrome.runtime.sendMessage(data);
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 let busy=false,restart=false;
 const signature=rows=>rows.map(row=>PropertyCollector.profileUrl(row.url).key).sort().join('|');
 async function state(runId,status,reason){await send({type:'AI_PROPERTY_DIRECTORY_STATE_V1',runId,status,reason});}
 async function collect(){
  if(busy)return;busy=true;
  try{
   const hello=await send({type:'AI_PROPERTY_DIRECTORY_HELLO_V1'});if(hello.status!=='running')return;
   const runId=hello.runId;let previous='',pageNumber=hello.initialPageNumber||1;const seekPage=hello.seekPage||1;
   while(true){
    const check=await send({type:'AI_PROPERTY_DIRECTORY_HELLO_V1'});if(check.status!=='running'||check.runId!==runId)return;
    let rows=[];
    // Wait for hydrated cards and scroll to trigger the directory's own lazy loading.
    for(let round=0;round<14;round++){
     const current=PropertyCollector.extract(document,location.href);
     if(current.length)rows=current;
     if(PropertyCollector.blocked(document)&&!rows.length){await state(runId,'blocked','A Sotheby’s pediu uma verificação nesta aba. Conclua a verificação e clique em Retomar no CRM.');return;}
     if(rows.length&&round>=3)break;
     window.scrollTo(0,document.documentElement.scrollHeight);await wait(900);
    }
    if(!rows.length){await state(runId,'error','A página não apresentou perfis reconhecíveis. Nenhum contato foi inventado.');return;}
    for(let round=0;round<3;round++){window.scrollTo(0,document.documentElement.scrollHeight);await wait(650);rows=PropertyCollector.extract(document,location.href);}
    const key=signature(rows);
    if(key===previous){await state(runId,'paused','A próxima página repetiu os mesmos perfis. A coleta foi pausada para evitar repetições.');return;}
    if(pageNumber>=seekPage){const response=await send({type:'AI_PROPERTY_DIRECTORY_PAGE_V1',runId,contacts:rows,pageNumber});if(response.error)throw Error(response.error);if(response.status!=='running')return;}
    else{const response=await send({type:'AI_PROPERTY_DIRECTORY_SEEK_V1',runId});if(response.status!=='running')return;}
    const next=PropertyCollector.nextControl(document,location.href);
    if(!next){await state(runId,pageNumber<seekPage?'paused':'completed',pageNumber<seekPage?'Não foi possível reencontrar a página salva. O ponto anterior foi preservado.':'Fim do percurso: não foi encontrado outro controle de próxima página ou carregar mais.');return;}
    const navigation=await send({type:'AI_PROPERTY_DIRECTORY_NAVIGATE_V1',runId,nextPageNumber:pageNumber+1});if(navigation.status!=='running')return;
    previous=key;next.click();
    let changed=false;
    for(let round=0;round<35;round++){
     await wait(800);
     const check=await send({type:'AI_PROPERTY_DIRECTORY_HELLO_V1'});if(check.status!=='running'||check.runId!==runId)return;
     if(PropertyCollector.blocked(document)&&!PropertyCollector.extract(document,location.href).length){await state(runId,'blocked','A Sotheby’s pediu verificação ao trocar de página. Conclua a verificação e retome pelo CRM.');return;}
     const current=PropertyCollector.extract(document,location.href);if(current.length&&signature(current)!==key){changed=true;break;}
    }
    if(!changed){await state(runId,'paused','O diretório não avançou após o clique automático. Os contatos já captados foram preservados.');return;}
    pageNumber++;
   }
  }catch(error){try{const hello=await send({type:'AI_PROPERTY_DIRECTORY_HELLO_V1'});if(hello.runId)await state(hello.runId,'error',error.message||'A coleta foi interrompida.');}catch{}}
  finally{busy=false;if(restart){restart=false;setTimeout(collect,200);}}
 }
 chrome.runtime.onMessage.addListener(message=>{if(message?.type==='AI_PROPERTY_DIRECTORY_SCAN_V1'){if(busy)restart=true;else collect();}});
 collect();setTimeout(collect,1800);
})();
