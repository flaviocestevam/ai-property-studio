// Contact payload is captured at document_start and retained for this tab/profile.
(() => {
 const boot=data=>{
  if(!data||data.project!=='ai-property-crm'||data.version!==1||typeof data.message!=='string')return;
  if(!/^\/[a-z]{3}\/associate\//i.test(location.pathname))return;
  const box = document.createElement('aside');
  box.setAttribute('aria-live', 'polite');
  box.setAttribute('data-ai-property-diagnostics','');
  Object.assign(box.style,{position:'fixed',bottom:'20px',right:'20px',zIndex:'2147483647',maxWidth:'370px',padding:'18px',borderRadius:'12px',background:'#102e35',color:'#fff',font:'14px/1.5 Arial,sans-serif',boxShadow:'0 8px 35px #0004'});
  const title = document.createElement('strong'); title.textContent = 'AI Property CRM';
  const status = document.createElement('p'); status.style.margin = '8px 0';
  const retry = document.createElement('button'); retry.textContent = 'Preencher novamente'; retry.type = 'button';
  const close = document.createElement('button'); close.textContent = 'Fechar'; close.type='button';
  const diagnose=document.createElement('button');diagnose.type='button';diagnose.textContent='Verificar formulário';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar diagnóstico';copy.hidden=true;
  const diagnostic=document.createElement('div');diagnostic.hidden=true;
  Object.assign(diagnostic.style,{whiteSpace:'pre-line',fontSize:'12px',maxHeight:'42vh',overflowY:'auto',marginTop:'12px',paddingTop:'10px',borderTop:'1px solid #ffffff44'});
  for(const button of [retry,diagnose,copy,close]) Object.assign(button.style,{padding:'8px 12px',marginRight:'8px',marginBottom:'8px',cursor:'pointer',border:'1px solid #ffffff55',borderRadius:'6px',background:'transparent',color:'#fff'});
  box.append(title,status,retry,diagnose,copy,close,diagnostic); document.documentElement.appendChild(box);
  const filled = new Set(),written=new WeakMap(),edited=new WeakSet();
  document.addEventListener('input',event=>{if(event.isTrusted&&!box.contains(event.target))edited.add(event.target);},true);
  const resourceFailures=new Set();let latestReport=null,lastSendClick=null;
  const preferredMessage=()=>[...document.querySelectorAll('textarea')].find(el=>el.getClientRects().length&&!box.contains(el));
  const inspect=()=>{
    if(!globalThis.PropertyFormDiagnostics)return;
    const result=PropertyFormDiagnostics.read(document,preferredMessage());
    latestReport={page:location.origin+location.pathname,checkedAt:new Date().toISOString(),lastSendClick,...result,resourceFailures:[...resourceFailures]};
    const counts=result.messages.map(m=>`Mensagem: ${m.characters} caracteres. ${m.maxLength===null?'Sem limite de tamanho declarado no HTML; o servidor pode ter um limite próprio.':`Limite declarado: ${m.maxLength}.`}`);
    const issues=[...result.issues,...resourceFailures];
    diagnostic.textContent=[...counts,...(issues.length?['Pendências encontradas:',...issues.map(value=>'• '+value)]:['Nenhuma pendência foi encontrada nas verificações visíveis. Isso não confirma o envio nem a aceitação pelo servidor.']),...(result.siteMessages?.length?['Retorno visível do site:',...result.siteMessages]:[]),result.captcha?'reCAPTCHA presente. A validação pode ocorrer ao clicar em SEND MESSAGE; a presença do aviso não confirma que ela passou.':'reCAPTCHA não identificado neste formulário.',lastSendClick?'Última tentativa de envio observada: '+new Date(lastSendClick).toLocaleTimeString('pt-BR'):null].filter(Boolean).join('\n\n');
    diagnostic.hidden=false;copy.hidden=false;
  };
  diagnose.addEventListener('click',inspect);
  copy.addEventListener('click',async()=>{inspect();try{await navigator.clipboard.writeText(JSON.stringify(latestReport,null,2));copy.textContent='Diagnóstico copiado';}catch{diagnostic.textContent+='\n\nNão foi possível copiar automaticamente. Envie uma captura deste painel.';}});
  document.addEventListener('invalid',event=>{if(!box.contains(event.target))inspect();},true);
  document.addEventListener('click',event=>{
    if(box.contains(event.target))return;
    const button=event.target.closest?.('button,input[type="submit"],[role="button"]');
    if(!button||!/send\s*message|submit|enviar/i.test((button.textContent||button.value||'').trim()))return;
    lastSendClick=new Date().toISOString();inspect();setTimeout(inspect,800);setTimeout(inspect,3000);setTimeout(inspect,8000);
  },true);
  window.addEventListener('error',event=>{const src=event.target?.src||'';if(/recaptcha/i.test(src)){resourceFailures.add('Falha observada ao carregar um recurso usado pelo reCAPTCHA.');inspect();}},true);
  document.addEventListener('securitypolicyviolation',event=>{if(/recaptcha/i.test(event.blockedURI||'')){resourceFailures.add('O navegador bloqueou um recurso do reCAPTCHA por uma regra de segurança da página.');inspect();}});
  const textFor = el => {
    const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    return [el.name,el.id,el.placeholder,el.autocomplete,el.getAttribute('aria-label'),label?.textContent,el.closest('label')?.textContent].filter(Boolean).join(' ').toLowerCase();
  };
  const valueFor = el => {
    const key = textFor(el).replace(/[_-]/g,' ');
    if (el.type === 'email' || /e-?mail/.test(key)) return ['email',data.email];
    if (el.type === 'tel' || /phone|telephone|mobile|telefone/.test(key)) return ['phone',data.phone];
    if (/first\s*name|firstname|given\s*name|givenname|prénom/.test(key)) return ['firstName',data.firstName];
    if (/last\s*name|lastname|family\s*name|familyname|surname|sobrenome/.test(key)) return ['lastName',data.lastName];
    if (/subject|assunto/.test(key)) return ['subject',data.subject];
    if (el instanceof HTMLTextAreaElement || /message|mensagem|comment|enquiry|inquiry|how can we help/.test(key)) return ['message',data.message];
    if (/company|business|organisation|organization/.test(key)) return ['company',data.company];
    if (/website|web site|url/.test(key)) return ['website',data.website];
    if (/\bname\b|fullname|\bnome\b/.test(key)) return ['name',data.name];
    return ['', ''];
  };
  const scan = (force=false) => {
    const messageArea=preferredMessage(),form=messageArea?.closest('form');
    const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=password]):not([type=search]):not([type=file]), textarea')]
      .filter(el => messageArea&&!el.disabled&&!el.readOnly&&el.getClientRects().length&&!box.contains(el)&&(!form||form.contains(el)));
    for (const el of fields) {
      const [key,value] = valueFor(el);
      if(!value||(!force&&edited.has(el)))continue;
      if(!force&&written.has(el)&&el.value!==written.get(el)&&el.value.trim()){edited.add(el);continue;}
      if(el.value===value){filled.add(key);continue;}
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto,'value')?.set;
      setter ? setter.call(el,value) : (el.value=value);
      el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
      written.set(el,value);filled.add(key);
    }
    const current=new Set(fields.filter(el=>{const [key,value]=valueFor(el);return key&&value&&el.value===value;}).map(el=>valueFor(el)[0]));
    const count = current.size;
    const area=preferredMessage();const limit=area&&globalThis.PropertyFormDiagnostics?PropertyFormDiagnostics.maxLength(area):null;
    const lengthNote=area?` Mensagem: ${area.value.length} caracteres${limit===null?'':` / limite ${limit}`}.`:'';
    const message = count ? `${count} tipos de campo preenchidos.${lengthNote} Use “Verificar formulário” se o envio não responder.` : 'Abra o formulário em “Contact” ou “Send a message”. Os campos serão preenchidos quando aparecerem.';
    if(status.textContent !== message) status.textContent=message;
  };
  let timer;
  const observer = new MutationObserver(records => {
    if(records.every(record => box.contains(record.target))) return;
    clearTimeout(timer); timer=setTimeout(()=>scan(),250);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden','name','id','placeholder','aria-label','disabled','readonly']});
  retry.addEventListener('click',()=>scan(true));
  close.addEventListener('click',()=>{observer.disconnect();clearTimeout(timer);box.remove();});
  document.addEventListener('click',event=>{if(!box.contains(event.target)){setTimeout(()=>scan(),150);setTimeout(()=>scan(),700);}},true);
  document.addEventListener('focusin',event=>{if(!box.contains(event.target))scan();},true);
  scan();

 };
 if(globalThis.AIPropertyPayloadReady){globalThis.AIPropertyPayloadReady.then(boot);return;}
 // Standalone fallback for testing and older installations.
 const match=location.hash.match(/(?:^#|&)aipropertycrm_v1=([^&]+)/);if(!match)return;
 try{const binary=atob(decodeURIComponent(match[1]));const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
 if(data.project!=='ai-property-crm'||data.version!==1)return;
 history.replaceState(null,'',location.pathname+location.search);boot(data);}catch{}
})();
