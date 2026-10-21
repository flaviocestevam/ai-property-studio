import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const context={CSS:{escape:s=>s}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/extension/form-diagnostics.js','utf8'),context);
const diagnostic=context.PropertyFormDiagnostics;
function field(name,value,attributes={}){return {name,id:name,value,type:attributes.type||'text',tagName:attributes.tagName||'INPUT',required:Boolean(attributes.required),checked:Boolean(attributes.checked),validity:{valid:attributes.valid!==false},validationMessage:attributes.validationMessage||'',getClientRects:()=>[1],getAttribute:key=>attributes[key]??null,closest:()=>null};}
const textarea=field('Message','x'.repeat(789),{tagName:'TEXTAREA',maxlength:'500'});
const fields=[field('First Name','',{required:true}),field('Email Address','invalid',{type:'email',valid:false,validationMessage:'Enter a valid email address.'}),field('Phone','5567',{type:'tel',valid:false,pattern:'[0-9]{11}',validationMessage:'Use the requested phone format.'}),textarea,field('Required consent','on',{type:'checkbox',required:true})];
const submit={textContent:'SEND MESSAGE',disabled:true,getAttribute:()=>null};
const doc={querySelector:selector=>selector.includes('recaptcha')?{}:null,querySelectorAll:selector=>selector==='input,textarea,select'?fields:selector.startsWith('button')?[submit]:[]};
const report=diagnostic.read(doc,textarea);
assert.equal(report.messages[0].characters,789);assert.equal(report.messages[0].maxLength,500);assert.ok(report.issues.some(x=>x.includes('789')&&x.includes('500')));assert.ok(report.issues.some(x=>x.includes('First Name')&&x.includes('obrigatório')));assert.ok(report.issues.some(x=>x.includes('email address')));assert.ok(report.issues.some(x=>x.includes('Phone')));assert.ok(report.issues.some(x=>x.includes('consent')));assert.ok(report.issues.some(x=>x.includes('desativado')));assert.equal(report.captcha,true);assert.ok(report.fields.every(x=>!('value' in x)));
const unlimited=field('Message','x'.repeat(789),{tagName:'TEXTAREA'});assert.equal(diagnostic.maxLength(unlimited),null);
assert.equal(diagnostic.maxLength(field('Message','text',{'data-val-length-max':'1000'})),1000);
console.log('PASS: actual length constraints, missing required fields, email and phone validation, required consent left untouched, disabled submit, reCAPTCHA presence and reports without field values');
