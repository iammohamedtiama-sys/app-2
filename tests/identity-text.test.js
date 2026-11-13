import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIdentityText} from '../src/identity-text.js';
import {sessionMatches} from '../src/auth-state.js';

test('CNIB : le numéro espacé est proposé et la date ne devient pas un numéro',()=>{
 const r=parseIdentityText('CARTE NATIONALE D’IDENTITE\nN° B 1234 5678\nNaissance 12/03/2002\nNom / Surname : TRAORE\nPrénoms / Given names : AMADOU');
 assert.equal(r.primaryNumber,'B12345678');assert.equal(r.kind,'CNIB');assert.equal(r.customerName,'AMADOU TRAORE');assert.ok(!r.candidates.includes('12032002'));assert.equal(r.requiresConfirmation,true);
});
test('passeport A : le numéro et les noms sur une autre ligne sont lus',()=>{
 const r=parseIdentityText('PASSEPORT\nDocument Number : A1234567\nSurname\nKONE\nGiven Names\nAISSA');
 assert.equal(r.primaryNumber,'A1234567');assert.equal(r.customerName,'AISSA KONE');assert.equal(r.kind,'Passeport');
});
test('une photo illisible ne produit pas un faux numéro',()=>{
 assert.deepEqual(parseIdentityText('République du Burkina Faso\nDate 12/03/2002\n2026').candidates,[]);
});
test('les confusions OCR O/0 dans une séquence numérique gardent le préfixe',()=>{
 assert.equal(parseIdentityText('N° B012O3456').primaryNumber,'B01203456');
});
const token=data=>Buffer.from(JSON.stringify(data)).toString('base64url')+'.signature';
test('un jeton d’un autre compte ou d’une autre société ne peut pas servir à la session',()=>{
 const user={id:'agent'},company={id:'yam'};
 assert.equal(sessionMatches(token({uid:'agent',cid:'yam'}),user,company),true);
 assert.equal(sessionMatches(token({uid:'root',cid:'yam'}),user,company),false);
 assert.equal(sessionMatches(token({uid:'agent',cid:'other'}),user,company),false);
 assert.equal(sessionMatches('invalid',user,company),false);
});
test('passeport MRZ : nom et expiration sont proposés avec le numéro A',()=>{
 const r=parseIdentityText('P<BFATRAORE<<AMADOU<<<<<<<<<<<<<<<<<<<<<<<<<\nA123456789BFA0203250M3003120<<<<<<<<<<<<<<04');
 assert.equal(r.primaryNumber,'A12345678');assert.equal(r.customerName,'AMADOU TRAORE');assert.equal(r.expiresOn,'2030-03-12');
 assert.equal(r.birthDate,'2002-03-25');
});

test('naissance : ne confond pas date de naissance et expiration et refuse les dates impossibles',()=>{
 assert.equal(parseIdentityText('CNIB\nDate de naissance 25/03/2002\nExpiration 12/03/2030').birthDate,'2002-03-25');
 assert.equal(parseIdentityText('CNIB\nDate de naissance 31/02/2002').birthDate,'');
 assert.equal(parseIdentityText('CNIB\nDate de naissance 25/03/2099').birthDate,'');
 assert.equal(parseIdentityText('CNIB\nDate de naissance\n25/03/2002').birthDate,'2002-03-25');
 assert.equal(parseIdentityText('CNIB\nExpiration 25/03/2030').birthDate,'');
});
