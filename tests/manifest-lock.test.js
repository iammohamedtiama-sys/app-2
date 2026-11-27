import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {manifestLocked,manifestEditAttributes,manifestLockMessage,refreshManifestLocks} from '../src/manifest-guard.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const listSource=main.slice(main.indexOf('function manifests(){'),main.indexOf('function reportFiltered(){'));
const editorSource=main.slice(main.indexOf('function openManifestCreator('),main.indexOf('function manifestRows('));
const base={id:'manifest',code:'BRD-TEST',origin:'Ouaga',destination:'Bobo',departureAt:'2026-11-20T10:00:00',shipmentIds:['parcel'],route:'Route',dispatchedAt:'2026-11-20T10:00:00'};

test('le vrai écran des bordereaux grise Modifier uniquement après confirmation d’arrivée',()=>{
 const state={manifests:[{...base,id:'before'},{...base,id:'after',arrivedAt:'2026-11-20T12:00:00'}]};
 const context={state,shell:s=>s,icon:()=>'',esc:s=>String(s||''),manifestRows:()=>[],manifestEditAttributes};
 const html=vm.runInNewContext(listSource+';manifests()',context),dom=new JSDOM(html);
 assert.equal(dom.window.document.querySelector('[data-edit-manifest="before"]').disabled,false);
 const locked=dom.window.document.querySelector('[data-edit-manifest="after"]');assert.equal(locked.disabled,true);assert.equal(locked.getAttribute('aria-disabled'),'true');assert.equal(locked.title,manifestLockMessage);
 assert.equal(dom.window.document.querySelector('[data-preview-manifest="after"]').disabled,false);
 assert.equal(dom.window.document.querySelector('[data-pdf-manifest="after"]').disabled,false);
});

test('ouvrir directement un ancien bouton ne contourne pas le verrou',()=>{
 let message='';const arrived={...base,arrivedAt:'confirmed'};
 const context={state:{manifests:[arrived]},manifestLocked,manifestLockMessage,notify:m=>message=m};
 vm.runInNewContext(editorSource,context);context.openManifestCreator({...base});assert.equal(message,manifestLockMessage);
});

test('le formulaire déjà ouvert refuse d’enregistrer si une arrivée est synchronisée entre-temps',()=>{
 const dom=new JSDOM('<div id="manifestHost"></div>'),original={...base};let message='',persisted=0;
 const parcel={id:'parcel',code:'OUA-001',origin:'Ouaga',destination:'Bobo',status:'Expédié',manifestId:base.id,parcelCount:1};
 const context={document:dom.window.document,state:{manifests:[original],shipments:[parcel]},visibleShipments:()=>[parcel],manifestLocked,manifestLockMessage,notify:m=>message=m,esc:s=>String(s||''),icon:()=>'',agencyOptions:()=>'<option value="Bobo">Bobo</option>',persist:()=>persisted++};
 vm.runInNewContext(editorSource,context);context.openManifestCreator(original);
 context.state.manifests=[{...original,arrivedAt:'confirmed'}];
 dom.window.document.querySelector('#manifestForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(message,manifestLockMessage);assert.equal(persisted,0);assert.equal(original.arrivedAt,undefined);assert.equal(parcel.status,'Expédié');
});


test('une arrivée reçue en synchronisation grise le bouton et verrouille un formulaire déjà affiché',()=>{
 const dom=new JSDOM('<button data-edit-manifest="manifest">Modifier</button><form id="manifestForm" data-manifest-id="manifest"><input name="route"><button type="submit">Enregistrer</button><button id="closeManifest" type="button">Fermer</button></form>');
 refreshManifestLocks([{...base,arrivedAt:'confirmed'}],dom.window.document);
 assert.equal(dom.window.document.querySelector('[data-edit-manifest]').disabled,true);
 assert.equal(dom.window.document.querySelector('[type=submit]').disabled,true);
 assert.equal(dom.window.document.querySelector('input').disabled,true);
 assert.equal(dom.window.document.querySelector('#closeManifest').disabled,false);
 refreshManifestLocks([{...base,arrivedAt:'confirmed'}],dom.window.document);
 assert.equal(dom.window.document.querySelectorAll('[data-manifest-lock-note]').length,1);
});
