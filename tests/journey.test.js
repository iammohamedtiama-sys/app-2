import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyStops,journeySpan,segmentFare} from '../src/transport-model.js';
for(const stops of [' Boromo ; Houndé\n',[' Boromo ',{name:'Houndé'}],'Boromo,Houndé'])test('arrêts harmonisés pour '+JSON.stringify(stops),()=>{
 const tr={origin:' Ouagadougou\u00a0',destination:' BOBO ',stops};
 assert.deepEqual(journeyStops(tr),['Ouagadougou','Boromo','Houndé','BOBO']);
 assert.equal(journeySpan(tr,'ouagadougou','HOUNDE ').to,'Houndé');
});
test('un arrêt absent ou un trajet inversé ne devient pas un siège disponible',()=>{
 const tr={origin:'Ouaga',destination:'Bobo'};
 assert.throws(()=>journeySpan(tr,'Paris','Bobo'));
 assert.throws(()=>journeySpan(tr,'Bobo','Ouaga'));
});
