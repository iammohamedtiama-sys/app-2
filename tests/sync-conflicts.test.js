import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {reconcileSyncConflicts,bindSyncConflictReview} from '../src/sync-conflicts.js';

test('une version périmée conserve la saisie locale indépendante de la version serveur',()=>{
 const local={id:'one',fee:4000,_serverVersion:1},server={id:'one',fee:5000,_serverVersion:2};
 const result=reconcileSyncConflicts([],[{type:'stale_version',entityType:'shipments',id:'one'}],{shipments:[local]},{shipments:[server]},'stamp');
 assert.equal(result.archive[0].local.fee,4000);assert.equal(result.records[0].server.fee,5000);
 local.fee=0;server.fee=0;assert.equal(result.archive[0].local.fee,4000);assert.equal(result.archive[0].server.fee,5000);
});
test('un refus de siège sans version distante reste récupérable et ne se duplique pas',()=>{
 const sent={tickets:[{id:'sale',pnr:'PNR',paid:5000}]},conflicts=[{type:'seat_conflict',entityType:'tickets',id:'sale'}];
 const first=reconcileSyncConflicts([],conflicts,sent,{}),again=reconcileSyncConflicts(first.archive,conflicts,sent,{});
 assert.equal(again.archive.length,1);assert.equal(again.archive[0].local.paid,5000);assert.equal(again.records[0].server,null);
});
test('un ancien conflit sans entityType n’agit que sur un identifiant non ambigu',()=>{
 const c=[{type:'assignment_required',id:'one'}];
 assert.equal(reconcileSyncConflicts([],c,{tickets:[{id:'one'}]},{}).records[0].kind,'tickets');
 assert.equal(reconcileSyncConflicts([],c,{tickets:[{id:'one'}],shipments:[{id:'one'}]},{}).records[0].kind,'');
});
test('la résolution garde la copie locale et ne modifie pas le serveur',()=>{
 const dom=new JSDOM('<button id="syncReview"></button><div id="fullMenuHost"></div>');global.document=dom.window.document;
 const state={company:{id:'yam'},user:{id:'agent'},syncConflicts:[{key:'x',entityId:'ticket',local:{paid:5000},server:{paid:6000},status:'pending',message:'Conflit'}]};let saved=0,rendered=0,exported;
 bindSyncConflictReview({state,esc:s=>String(s||'').replaceAll('<','&lt;'),save(){saved++;},render(){rendered++;},download:p=>exported=p});
 document.querySelector('#syncReview').click();document.querySelector('[data-sync-export]').click();assert.equal(exported.local.paid,5000);
 document.querySelector('[data-sync-resolve]').click();assert.equal(state.syncConflicts[0].status,'archived');assert.equal(state.syncConflicts[0].local.paid,5000);assert.equal(saved,1);assert.equal(rendered,1);
});
test('un conflit antérieur ne bloque pas une nouvelle réservation de siège validée par le serveur',async()=>{
 const url=new URL('../src/transport-ui.js',import.meta.url);
 const source=(await readFile(url,'utf8')).replace("import './transport.css';",'').replace(/from '\.\/([^']+)'/g,(_,file)=>"from '"+new URL(file,url).href+"'");
 const {createTransportUi}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 Object.defineProperty(global,'navigator',{value:{onLine:true},configurable:true});let called=0;
 global.fetch=async(url,req)=>{called++;assert.ok(url.endsWith('/holds'));assert.equal(JSON.parse(req.body).seat,'A2');return {ok:true,json:async()=>({id:'hold'})};};
 const ui=createTransportUi({state:{syncStatus:'conflict',authToken:'token',company:{id:'yam'}},serverUrl:()=>'',sync:async()=>true,deviceId:()=> 'phone',notify(){}});
 await ui.selectSeat('trip','A2','Ouaga','Bobo');assert.equal(called,1);
});
