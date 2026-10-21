(() => {
 const text=value=>String(value||'').replace(/\s+/g,' ').trim();
 function label(el,doc){const explicit=el.id?doc.querySelector(`label[for="${CSS.escape(el.id)}"]`):null;return text(explicit?.textContent||el.getAttribute('aria-label')||el.placeholder||el.name||el.id||el.tagName).slice(0,90);}
 function maxLength(el){for(const key of ['maxlength','data-val-length-max']){const value=el.getAttribute(key);if(value!==null&&value!==''&&/^\d+$/.test(value))return Number(value);}return null;}
 function read(doc,preferred){
   const root=preferred?.closest('form')||doc;
   const fields=[...root.querySelectorAll('input,textarea,select')].filter(el=>!el.disabled&&el.getClientRects().length&&!['hidden','submit','button','reset','search','password','file'].includes(el.type)&&!el.closest('[data-ai-property-diagnostics]'));
   const issues=[],messages=[],details=[],siteMessages=[];
   for(const el of fields){
     const name=label(el,doc),value=String(el.value||''),required=el.required||el.getAttribute('aria-required')==='true',limit=maxLength(el);
     const empty=['checkbox','radio'].includes(el.type)?!el.checked:!value.trim();
     if(required&&empty)issues.push(`${name}: campo obrigatório pendente.`);
     if(limit!==null&&value.length>limit)issues.push(`${name}: ${value.length} caracteres excedem o limite declarado de ${limit}.`);
     if(el.validity?.valid===false&&!(required&&empty))issues.push(`${name}: ${el.validationMessage||'o navegador considera este campo inválido.'}`);
     if(el.getAttribute('aria-invalid')==='true')issues.push(`${name}: o site marcou este campo como inválido.`);
     if(el.tagName==='TEXTAREA')messages.push({characters:value.length,maxLength:limit});
     details.push({field:name,type:el.type||el.tagName,required:Boolean(required),empty,characters:['checkbox','radio'].includes(el.type)?null:value.length,maxLength:limit,pattern:el.getAttribute('pattern')||null,valid:el.validity?.valid??null});
   }
   for(const el of root.querySelectorAll('[role="alert"],[aria-live="assertive"],.field-validation-error,.invalid-feedback,.validation-error,.error-message,[class*="errorMessage"]')){
     if(!el.getClientRects().length||el.closest('[data-ai-property-diagnostics]'))continue;const message=text(el.textContent);if(message&&message.length<700){siteMessages.push(message);if(/error|invalid|required|too long|could not|cannot|failed|unable|try again|please (?:enter|select|verify)|erro|inválid|obrigat/i.test(message)||/error|invalid-feedback/i.test(String(el.className||'')))issues.push(message);}
   }
   const buttons=[...root.querySelectorAll('button,input[type="submit"]')].filter(el=>/send\s*message|send|submit|enviar/i.test(text(el.textContent||el.value)));
   if(buttons.length&&buttons.every(el=>el.disabled||el.getAttribute('aria-disabled')==='true'))issues.push('O botão de envio está desativado pelo site.');
   const captcha=Boolean(doc.querySelector('iframe[src*="recaptcha"],.g-recaptcha,[name="g-recaptcha-response"],script[src*="recaptcha"]'));
   return {messages,fields:details,issues:[...new Set(issues)],siteMessages:[...new Set(siteMessages)],captcha};
 }
 globalThis.PropertyFormDiagnostics={read,maxLength};
})();
