/* Shared parsing for the exclusive AI Property CRM directory collector. */
(() => {
  const HOST='www.sothebysrealty.com';
  function profileUrl(value,base='https://'+HOST){
    try{const u=new URL(value,base);const m=u.pathname.match(/^\/[a-z]{3}\/associate\/([^/]+)\/([^/]+)\/?$/i);
      if(u.protocol!=='https:'||u.hostname!==HOST||!m||/^(sales|rentals|rentals-unused|brokersales)$/i.test(m[2]))return null;
      return {url:'https://'+HOST+'/eng/associate/'+m[1]+'/'+m[2],key:m[1].toLowerCase(),slug:m[2]};
    }catch{return null;}
  }
  function directoryUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===HOST&&/^\/eng\/associates(?:\/|$)/.test(u.pathname)?u.toString():null;}catch{return null;}}
  function nameFromSlug(slug){return decodeURIComponent(slug).replace(/-/g,' ').replace(/\b\p{L}/gu,c=>c.toUpperCase());}
  const tidy=value=>String(value||'').replace(/\s+/g,' ').trim();
  const genericName=value=>!value||value.length>100||/^(view|see|learn|contact|send|more|details|profile|read|visit|real estate|image|photo)/i.test(value);
  function extract(doc,source){
    const found=new Map();
    for(const a of doc.querySelectorAll('a[href]')){
      const p=profileUrl(a.href||a.getAttribute('href'),source);if(!p||!a.getClientRects().length)continue;
      const card=a.closest('article, li, [role="listitem"], [class*="agent-card"], [class*="associate-card"], [class*="AgentCard"], [class*="AssociateCard"]');
      const heading=card?.querySelector('h2,h3,h4,[class*="agent-name"],[class*="associate-name"]');
      let name=tidy(heading?.textContent)||tidy(a.textContent);
      if(genericName(name))name=tidy(a.getAttribute('aria-label'));
      if(genericName(name))name=nameFromSlug(p.slug);
      const region=tidy(card?.querySelector('[class*="location"],[class*="Location"],[itemprop="addressLocality"]')?.textContent).slice(0,160);
      const old=found.get(p.key);if(!old||old.name===nameFromSlug(p.slug))found.set(p.key,{name,url:p.url,region,sourceUrl:source,sourceKind:'directory_dom',locatedAt:new Date().toISOString()});
    }
    return [...found.values()];
  }
  function nextControl(doc,source){
    const visible=el=>el.getClientRects().length&&!el.disabled&&!el.hasAttribute('disabled')&&el.getAttribute('aria-disabled')!=='true'&&!/\bdisabled\b/i.test(el.className||'');
    const safe=el=>{const href=el.getAttribute('href');return !href||href==='#'||Boolean(directoryUrl(new URL(href,source).toString()));};
    const links=[...doc.querySelectorAll('a[rel~="next"]')];
    for(const el of links)if(visible(el)&&safe(el))return el;
    const roots=[...doc.querySelectorAll('nav[aria-label*="pagina" i], nav[aria-label*="page" i], [class*="pagination" i], [class*="paging" i]')];
    const candidates=[...doc.querySelectorAll('a[aria-label*="next" i],button[aria-label*="next" i],a[title*="next" i],button[title*="next" i]'),...roots.flatMap(root=>[...root.querySelectorAll('a,button')])];
    for(const el of candidates){
      const text=tidy([el.getAttribute('aria-label'),el.getAttribute('title'),el.textContent].filter(Boolean).join(' '));
      if(visible(el)&&safe(el)&&!/slide|photo|image|gallery|property|listing|office/i.test(text)&&(/next|próxim[ao]|suivant|siguiente|load more|show more|carregar mais/i.test(text)||/^[›»→>]$/.test(text)))return el;
    }
    for(const root of roots){const current=root.querySelector('[aria-current="page"],.active,.selected');const number=Number(tidy(current?.textContent));if(!number)continue;const next=[...root.querySelectorAll('a,button')].find(el=>tidy(el.textContent)===String(number+1)&&visible(el)&&safe(el));if(next)return next;}
    for(const el of doc.querySelectorAll('button,a'))if(visible(el)&&safe(el)&&/^(load more|show more|carregar mais)(\s+(agents|associates|results|corretores))?$/i.test(tidy(el.textContent)))return el;
    return null;
  }
  function blocked(doc){return /verify (?:that )?you(?: are|'re|’re) (?:not )?(?:a )?(?:robot|human)|access denied|request blocked|enable javascript|security check|complete the captcha/i.test((doc.body?.innerText||'').slice(0,20000));}
  globalThis.PropertyCollector={profileUrl,directoryUrl,nameFromSlug,extract,nextControl,blocked};
})();
