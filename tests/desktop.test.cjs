const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ticketDocument}=require('../desktop/ticket.cjs');
test('le reçu et le talon Windows gardent leurs contenus séparés',()=>{
  const p={company:'Transport',code:'OUA-123',receipt:'CLIENT 2500 FCFA',parcel:'DESTINATAIRE TEST',printPart:'receipt'};
  const receipt=ticketDocument(p);assert.match(receipt,/CLIENT 2500 FCFA/);assert.doesNotMatch(receipt,/DESTINATAIRE TEST/);
  const label=ticketDocument({...p,printPart:'parcel'});assert.match(label,/DESTINATAIRE TEST/);assert.doesNotMatch(label,/CLIENT 2500 FCFA/);
  const both=ticketDocument({...p,printPart:'both'});assert.equal((both.match(/<section>/g)||[]).length,2);
});
test('les données imprimées ne peuvent pas injecter du HTML ou charger une image distante',()=>{
  const html=ticketDocument({company:'<script>alert(1)</script>',receipt:'<img src=x onerror=alert(1)>',logoImage:'https://example.invalid/logo.png',receiptQrImage:'data:image/svg+xml,<svg onload=alert(1)>',printPart:'receipt',paperWidth:58});
  assert.doesNotMatch(html,/<script|onerror=alert\(1\)>|src="https:|src="data:image\/svg/);
  assert.match(html,/&lt;script&gt;/);assert.match(html,/size:58mm/);
});
