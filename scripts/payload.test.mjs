import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/extension/payload.js','utf8');
const payload={project:'ai-property-crm',version:1,firstName:'Laissa',message:'Property — vídeo'};
const encoded=encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64'));
function setup(hash,reply){
 let sent,replaced=false;const location={pathname:'/eng/associate/180-test/test-person',search:'',hash};
 const context={location,history:{replaceState(){replaced=true;}},chrome:{runtime:{sendMessage:async message=>{sent=message;return reply;}}},atob:s=>Buffer.from(s,'base64').toString('binary'),TextDecoder,Uint8Array,decodeURIComponent};
 vm.createContext(context);vm.runInContext(source,context);return {context,location,sent:()=>sent,replaced:()=>replaced};
}
const first=setup('#aipropertycrm_v1='+encoded,{saved:true});first.location.hash='#contact';
assert.equal((await first.context.AIPropertyPayloadReady).message,payload.message);assert.equal(first.sent().type,'AI_PROPERTY_PAYLOAD_SAVE_V1');assert.equal(first.replaced(),true);
const reload=setup('',{payload});assert.equal((await reload.context.AIPropertyPayloadReady).firstName,'Laissa');assert.equal(reload.sent().type,'AI_PROPERTY_PAYLOAD_GET_V1');
const other=setup('',{payload:null});assert.equal(await other.context.AIPropertyPayloadReady,null);
console.log('PASS: payload captured before router change, retained for reload, Unicode preserved and no payload invented');
