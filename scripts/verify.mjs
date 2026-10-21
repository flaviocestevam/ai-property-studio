import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
const source=fs.readFileSync('dist/extension/autofill.js','utf8');
function extensionEnv({hashKey='aipropertycrm_v1',project='ai-property-crm'}={}){
 const data={project,version:1,firstName:'Flavio',lastName:'Cestevam',email:'sender@example.com',phone:'+55 67 9192-5533',message:'AI presenter — vídeo único',autoSubmit:true};
 class Input {constructor(key,value='',type='text'){this.name=key;this.id=key;this.placeholder='';this.type=type;this._value=value;this.disabled=false;this.readOnly=false;this.events=[];}get value(){return this._value;}set value(v){this._value=v;}getAttribute(){return null;}closest(){return null;}getClientRects(){return [1];}dispatchEvent(e){this.events.push(e.type);}}
 class TextArea extends Input{}
 class Box{constructor(){this.style={};this.children=[];this.textContent='';this.listeners={};}append(...v){this.children.push(...v);}appendChild(v){this.children.push(v);}contains(target){return target===this||this.children.includes(target);}setAttribute(){}addEventListener(type,fn){this.listeners[type]=fn;}remove(){}}
 let fields=[new Input('FirstName'),new Input('LastName'),new Input('EmailAddress','','email'),new Input('PhoneNumber','','tel'),new TextArea('Message','I’d like to discuss buying, selling, renting with you.')];
 const root=new Box();let observerCallback;let replaced=false;
 const context={location:{hash:'#'+hashKey+'='+encodeURIComponent(Buffer.from(JSON.stringify(data)).toString('base64')),pathname:'/eng/associate/180-example/name',search:''},history:{replaceState(){replaced=true;}},window:{addEventListener(){}},document:{documentElement:root,createElement:()=>new Box(),querySelector:()=>null,querySelectorAll:()=>fields,addEventListener(){}},CSS:{escape:s=>s},HTMLInputElement:Input,HTMLTextAreaElement:TextArea,TextDecoder,Uint8Array,atob:s=>Buffer.from(s,'base64').toString('binary'),decodeURIComponent,MutationObserver:class{constructor(fn){observerCallback=fn;}observe(){}disconnect(){}},Event:class{constructor(type){this.type=type;}},setTimeout:(fn,delay)=>{if(delay<1000)fn();return 1;},clearTimeout(){}};
 vm.runInNewContext(source,context);
 return {fields,root,data,replaced,setFields(v){fields=v;},scan(){observerCallback([{target:root}]);},Input,TextArea};
}
const e=extensionEnv();assert.deepEqual(e.fields.map(f=>f.value),['Flavio','Cestevam','sender@example.com','+55 67 9192-5533','AI presenter — vídeo único']);assert.equal(e.replaced,true);
e.fields[0].value='User edit';e.scan();assert.equal(e.fields[0].value,'User edit');
e.root.children[0].children.find(x=>x.textContent==='Preencher novamente').listeners.click();assert.equal(e.fields[0].value,'Flavio');
const dynamic=new e.TextArea('Message','Another website default message');e.setFields([dynamic]);e.scan();assert.equal(dynamic.value,e.data.message);
assert.equal(extensionEnv({hashKey:'afc'}).fields[0].value,'');assert.equal(extensionEnv({project:'ai-fashion-cast'}).fields[0].value,'');
assert.equal(/\.click\(|\.submit\(|requestSubmit\(/.test(source),false,'Extension must never submit');
console.log('PASS: five fields, default message replacement, dynamic fields, user edits, namespace isolation and no auto-send');

const appSource=fs.readFileSync('dist/app.js','utf8');
function appEnv(saved,durable=null){
 class El {constructor(){this.value='';this.hidden=false;this.innerHTML='';this.textContent='';this.listeners={};this.classList={toggle(){},add(){}};this.elements={};this.children=[];this.open=false;}addEventListener(t,f){this.listeners[t]=f;}replaceChildren(){this.children=[];}append(v){this.children.push(v);}showModal(){this.open=true;}close(){this.open=false;}closest(){return new El();}click(){}reset(){for(const v of Object.values(this.elements))v.value='';}reportValidity(){return true;}}
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id);};
 for(const key of ['firstName','lastName','email','phone','message'])get('campaignForm').elements[key]=new El();
 for(const key of ['url','name','region','status','notes','followup'])get('leadForm').elements[key]=new El();
 const status=get('leadForm').elements.status;status.options=[{value:'new'},{value:'opened'},{value:'replied'},{value:'closed'}];status.querySelector=s=>status.options.find(x=>s.includes('value='+x.value))||null;status.append=v=>status.options.push(v);
 const callbacks={};let stored=saved||null,opened=[],posted=[];get('filter').value='all';
 const window={addEventListener:(type,fn)=>callbacks[type]=fn,postMessage(data){posted.push(data);},open(url){opened.push(url);return {opener:window};}};
 if(durable)window.AIPropertyStateStore=durable;
 const context={document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>new El()},window,location:{origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site'},localStorage:{getItem:()=>stored,setItem:(key,value)=>stored=value},crypto:webcrypto,TextEncoder,URL,Date,Blob,atob,btoa,confirm:()=>true,navigator:{clipboard:{writeText:async()=>{}}},setTimeout:()=>1,clearTimeout(){},console};
 vm.runInNewContext(appSource,context);
 function fire(id,type,event={}){return get(id).listeners[type]?.({preventDefault(){},currentTarget:get(id),target:get(id),...event});}
 function action(type,id){fire('rows','click',{target:{closest:()=>({dataset:{action:type,id}})}});}
 return {get,fire,action,window,callbacks,opened,posted,state:()=>JSON.parse(stored),ready:(canCollect=false)=>callbacks.message({source:window,origin:context.location.origin,data:{type:'AI_PROPERTY_CRM_READY_V1',canCollect}})};
}
const a=appEnv();a.get('campaignForm').elements.email.value='sender@example.com';a.fire('campaignForm','submit');assert.equal(a.state().leads.length,1);
a.get('importText').value='Dasara | https://www.sothebysrealty.com/eng/associate/180-a-df240506071210843993/dasara-zymeri | CH\nOther | https://www.sothebysrealty.com/eng/associate/180-a-123/other-person | USA\nhttps://evil.example/eng/associate/a/b';a.fire('importForm','submit');assert.equal(a.state().leads.length,2);
a.ready();a.action('open','dasara-zymeri');assert.equal(a.state().leads[0].status,'opened');assert.equal(a.state().leads[0].sentAt,'');assert.equal(a.state().history[0].type,'opened');
const payload=JSON.parse(Buffer.from(decodeURIComponent(new URL(a.opened[0]).hash.split('=')[1]),'base64').toString());assert.equal(payload.project,'ai-property-crm');assert.equal(payload.autoSubmit,false);assert.equal(payload.email,'sender@example.com');
a.action('confirm','dasara-zymeri');assert.equal(a.state().leads[0].sentAt,'');a.get('reviewMessage').value='Actual text after manual edit';a.get('reviewActions').children[1].onclick();assert.equal(a.state().leads[0].status,'sent');assert.equal(a.state().history[1].message,'Actual text after manual edit');
a.get('campaignForm').elements.message.value='New campaign';a.fire('campaignForm','submit');assert.equal(a.state().history[1].message,'Actual text after manual edit');
const count=a.opened.length;a.action('open','dasara-zymeri');assert.equal(a.opened.length,count);
const b=appEnv(JSON.stringify(a.state()));assert.equal(b.get('total').textContent,2);assert.equal(b.get('sent').textContent,1);
console.log('PASS: sender save, deduplication, invalid URL rejection, payload, opened/sent distinction, actual sent text, immutable history, repeat prevention and reload');
const legacy=appSource.match(/const LEGACY_MESSAGE=`([\s\S]*?)`;/)[1];
const savedLegacy=a.state();savedLegacy.campaign.message=legacy.replace('Best,\nFlavio','Best,\nLaissa');
const upgraded=appEnv(JSON.stringify(savedLegacy));
assert.match(upgraded.state().campaign.message,/demonstration video/);
assert.match(upgraded.state().campaign.message,/https:\/\/bit\.ly\/ai-property-studio/);
assert.match(upgraded.state().campaign.message,/Best,\nLaissa/);
assert.equal(upgraded.state().history[1].message,'Actual text after manual edit');
const custom=a.state();custom.campaign.message='My own message';
assert.equal(appEnv(JSON.stringify(custom)).get('campaignForm').elements.message.value,'My own message');
console.log('PASS: legacy copy upgrade, Laissa signature, short link, historical text preservation and custom copy preservation');
const c=appEnv(JSON.stringify(a.state()));c.ready(true);
const capture={url:'https://www.sothebysrealty.com/eng/associate/180-a-captured/collected-person',name:'Collected Person',region:'From directory',sourceUrl:'https://www.sothebysrealty.com/eng/associates/int/agent-last-name-high-sort',locatedAt:'2026-10-20'};
const captureResult={type:'AI_PROPERTY_COLLECT_RESULT_V1',requestType:'AI_PROPERTY_COLLECT_STATUS_V1',job:{runId:'one-run',status:'running',total:3,pages:1},contacts:[capture,{...capture,url:capture.url.replace('/eng/','/spa/')},{...capture,url:'https://other.example/eng/associate/id/not-allowed'}],nextOffset:3};
c.callbacks.message({source:c.window,origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site',data:captureResult});
assert.equal(c.state().leads.length,3);assert.equal(c.state().leads[0].status,'sent');assert.equal(c.state().history[1].message,'Actual text after manual edit');assert.equal(c.state().collectionCheckpoint.offset,3);assert.equal(c.state().leads[2].sourceKind,'directory_dom');
c.callbacks.message({source:c.window,origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site',data:captureResult});assert.equal(c.state().leads.length,3);
console.log('PASS: automatic CRM import, duplicate aliases ignored, external domains rejected, existing outreach preserved and cursor saved');
const large=a.state();large.history=[];large.leads=Array.from({length:20000},(_,i)=>({...large.leads[0],id:'scale-'+i,name:'Person '+i,url:`https://www.sothebysrealty.com/eng/associate/180-scale-${i}/person-${i}`,status:'new',sentAt:'',attempt:null}));
let durableSaves=0;const scaled=appEnv(null,{ready:Promise.resolve(),getInitialState:()=>large,save:async value=>{assert.equal(value.leads.length,20000);durableSaves++;}});
await new Promise(setImmediate);assert.equal(scaled.get('total').textContent,20000);assert.equal((scaled.get('rows').innerHTML.match(/<tr>/g)||[]).length,100);
const savesBeforeCampaign=durableSaves;scaled.fire('campaignForm','submit');await Promise.resolve();assert.equal(durableSaves,savesBeforeCampaign+1);
console.log('PASS: 20,000-contact load with durable storage and only 100 rendered rows per page');

const numbered=appEnv(JSON.stringify(c.state()));
const originalNumbers=numbered.state().leads.map(l=>l.number);
assert.equal(new Set(originalNumbers).size,3);
assert.ok(originalNumbers.every(n=>Number.isSafeInteger(n)&&n>0));
numbered.get('search').value='Collected';numbered.get('search').oninput();
assert.match(numbered.get('rows').innerHTML,new RegExp('class="leadNumber">'+originalNumbers[2]+'<'));
const removed=numbered.state().leads[1];numbered.action('delete',removed.id);
assert.deepEqual(numbered.state().leads.map(l=>l.number),[originalNumbers[0],originalNumbers[2]]);
numbered.get('importText').value='New Person | https://www.sothebysrealty.com/eng/associate/180-new-number/new-person';numbered.fire('importForm','submit');
assert.ok(numbered.state().leads.at(-1).number>Math.max(...originalNumbers));
const reloadedNumbers=appEnv(JSON.stringify(numbered.state()));
assert.deepEqual(reloadedNumbers.state().leads.map(l=>l.number),numbered.state().leads.map(l=>l.number));
const duplicateNumbers=numbered.state();duplicateNumbers.leads[1].number=duplicateNumbers.leads[0].number;delete duplicateNumbers.leads[2].number;
assert.equal(new Set(appEnv(JSON.stringify(duplicateNumbers)).state().leads.map(l=>l.number)).size,3);
scaled.get('contactsPageNext').onclick();assert.match(scaled.get('contactsPageCount').textContent,/Página 2 de 200/);
assert.equal((scaled.get('rows').innerHTML.match(/<tr>/g)||[]).length,100);
console.log('PASS: permanent unique numbering, filters, deletion without reuse, imports, reload, duplicate repair and 200-page navigation');

const corrupt=appEnv('{broken json');
assert.throws(()=>corrupt.state());
corrupt.fire('campaignForm','submit');assert.throws(()=>corrupt.state());
assert.match(corrupt.get('toast').textContent,/Não foi possível carregar/);
const recoveryState=numbered.state();await corrupt.fire('restore','change',{target:{files:[{size:100,text:async()=>JSON.stringify(recoveryState)}],value:'backup.json'}});
assert.equal(corrupt.state().leads.length,recoveryState.leads.length);
const aliases=appEnv(JSON.stringify(a.state()));
aliases.get('importText').value=a.state().leads[0].url.replace('/eng/','/spa/');aliases.fire('importForm','submit');assert.equal(aliases.state().leads.length,2);
let shouldFail=false;const retryState=a.state();let latestSnapshot;
const retryApp=appEnv(null,{ready:Promise.resolve(),getInitialState:()=>retryState,save:async value=>{if(shouldFail){shouldFail=false;throw Error('quota');}latestSnapshot=JSON.parse(JSON.stringify(value));}});
await new Promise(setImmediate);retryApp.ready(true);shouldFail=true;
const deliver=()=>retryApp.callbacks.message({source:retryApp.window,origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site',data:captureResult});
deliver();await new Promise(setImmediate);
assert.equal(retryApp.posted.filter(m=>m.type==='AI_PROPERTY_COLLECT_ACK_V1').length,0);
deliver();await new Promise(setImmediate);
assert.equal(latestSnapshot.leads.length,3);assert.equal(retryApp.posted.filter(m=>m.type==='AI_PROPERTY_COLLECT_ACK_V1').length,1);
console.log('PASS: unreadable data preserved, valid backup restores writes, language aliases deduplicated, failed collection save retried before acknowledgment');

const deletion=appEnv(JSON.stringify(c.state()));deletion.ready(true);
const retainedHistory=deletion.state().history.length;
deletion.get('filter').value='new';deletion.get('filter').onchange();await deletion.get('deleteStatus').onclick();
assert.equal(deletion.state().leads.length,1);assert.equal(deletion.state().leads[0].status,'sent');assert.equal(deletion.state().history.length,retainedHistory);
deletion.callbacks.message({source:deletion.window,origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site',data:captureResult});assert.equal(deletion.state().leads.length,1,'Deleted contacts must not return from a stale batch');
await deletion.get('deleteAll').onclick();assert.equal(deletion.state().leads.length,0);assert.equal(deletion.state().collectionResetPending,true);assert.equal(deletion.state().history.length,retainedHistory);
deletion.callbacks.message({source:deletion.window,origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site',data:captureResult});assert.equal(deletion.state().leads.length,0);
deletion.callbacks.message({source:deletion.window,origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site',data:{type:'AI_PROPERTY_CRM_READY_V1',canCollect:true,canReset:true}});
assert.ok(deletion.posted.some(m=>m.type==='AI_PROPERTY_COLLECT_RESET_V1'));
deletion.callbacks.message({source:deletion.window,origin:'https://ai-property-crm.flaviocostaestevam.chatgpt.site',data:{type:'AI_PROPERTY_COLLECT_RESULT_V1',requestType:'AI_PROPERTY_COLLECT_RESET_V1',reset:true}});
assert.equal(deletion.state().collectionResetPending,false);assert.equal(deletion.state().nextLeadNumber,1);
assert.equal(deletion.state().campaign.message,c.state().campaign.message);
const manyDelete=appEnv(JSON.stringify(large));manyDelete.get('filter').value='new';await manyDelete.get('deleteStatus').onclick();assert.equal(manyDelete.state().leads.length,0,'Status deletion must include every page');
console.log('PASS: delete by status across all pages, delete all, history and sender retained, stale batch ignored and extension reset handshake');
