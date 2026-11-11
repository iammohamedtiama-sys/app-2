const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const PHOTO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAoCAIAAAAt2Q6oAAAAR0lEQVR4nO3OQQ0AIRAAseP8e1488BhC0irompnvNf/twAnpinRFuiJdka5IV6Qr0hXpinRFuiJdka5IV6Qr0hXpinRFuiJdka5IV6Qr0hXpinRFurIBCe0DTR7xkQEAAAAASUVORK5CYII=';
function dom(html=''){
 const d=new JSDOM('<main>'+html+'</main>',{url:'https://example.test/app/'});
 Object.assign(global,{window:d.window,document:d.window.document,Element:d.window.Element,MutationObserver:d.window.MutationObserver});
 Object.defineProperty(global,'navigator',{value:d.window.navigator,configurable:true});
 d.window.HTMLMediaElement.prototype.play=async()=>{};
 Object.defineProperties(d.window.HTMLVideoElement.prototype,{videoWidth:{get:()=>1920},videoHeight:{get:()=>1080}});
 d.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});d.window.HTMLCanvasElement.prototype.toDataURL=()=>PHOTO;
 let stopped=0;Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})},configurable:true});
 return {window:d.window,stopped:()=>stopped};
}
async function wait(predicate){for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw Error('DOM state not reached');}

test('la caméra prend une photo et libère les pistes',async()=>{
 const d=dom(),{captureCameraPhoto}=await import('../src/camera-capture.js');const pending=captureCameraPhoto();
 await wait(()=>document.querySelector('[data-camera-shoot]')?.disabled===false);document.querySelector('[data-camera-shoot]').click();
 assert.equal(await pending,PHOTO);assert.equal(d.stopped(),1);assert.equal(document.querySelector('video'),null);
});
test('annulation avant autorisation : une caméra arrivée tard est immédiatement arrêtée',async()=>{
 dom();let resolve,stopped=0;navigator.mediaDevices.getUserMedia=()=>new Promise(r=>resolve=r);
 const {captureCameraPhoto}=await import('../src/camera-capture.js'),pending=captureCameraPhoto(),rejected=assert.rejects(pending,e=>e.code==='CANCELLED');
 document.querySelector('[data-camera-cancel]').click();resolve({getTracks:()=>[{stop(){stopped++;}}]});await rejected;await wait(()=>stopped===1);
});
test('refus de permission : erreur lisible et aucune fenêtre caméra abandonnée',async()=>{
 dom();navigator.mediaDevices.getUserMedia=async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});};
 const {captureCameraPhoto}=await import('../src/camera-capture.js');await assert.rejects(captureCameraPhoto(),/Autorisez la caméra/);assert.equal(document.querySelector('.camera-capture'),null);
});
test('changer de page ferme la caméra et arrête le flux',async()=>{
 const d=dom(),{captureCameraPhoto}=await import('../src/camera-capture.js');const pending=captureCameraPhoto(),rejected=assert.rejects(pending,e=>e.code==='CANCELLED');await wait(()=>document.querySelector('[data-camera-shoot]')?.disabled===false);
 window.dispatchEvent(new window.Event('yam:navigate'));await rejected;assert.equal(d.stopped(),1);
});
test('le lecteur refuse les imports de fichiers',async()=>{
 dom();const {readIdentityDocument}=await import('../src/document-reader.js');await assert.rejects(readIdentityDocument({source:'file'},()=>{}),/import de fichier est désactivé/);
});
test('vente : photo caméra, numéro B lu, confirmation obligatoire et aucune galerie',async()=>{
 dom('<form id="ticketSaleForm"><div><label>Pièce<input name="documentNumber"></label></div><input name="passengerName"><input name="phone"></form>');
 const {createIdentityTicketUi}=await import('../src/identity-ticket-ui.js');
 const state={company:{id:'one'},user:{id:'agent'},page:'ticketSale'};
 const ui=createIdentityTicketUi({state,esc:x=>String(x||''),notify(){},render(){},api:async()=>({text:'CNIB\nN° B12345678\nNom TRAORE\nPrénoms AMADOU'})});ui.bind();
 assert.equal(document.querySelector('input[type=file]'),null);assert.equal(document.querySelector('#saleNativeGallery'),null);
 document.querySelector('#saleNativeCamera').click();await wait(()=>document.querySelector('[data-camera-shoot]')?.disabled===false);document.querySelector('[data-camera-shoot]').click();
 await wait(()=>document.querySelector('[name=documentNumber]').value==='B12345678');
 assert.throws(()=>ui.saleDocument(),/Vérifiez et confirmez/);document.querySelector('#saleIdentityConfirmed').checked=true;
 const value=ui.saleDocument();assert.equal(value.photo,PHOTO);assert.equal(value.number,'B12345678');assert.equal(value.kind,'CNIB');
 document.querySelector('#saleIdentityClear').click();assert.equal(ui.saleDocument(),null);
});
test('embarquement : photo passeport A, recherche automatique puis contrôle manuel',async()=>{
 dom('<select id="boardingTrip"><option value="trip">Voyage</option></select><section id="boardingIdentity"><label><input type="file" id="boardingIdentityPhoto"></label><img hidden><div id="boardingIdentityCandidates"></div><form><input name="number"><button type="submit">Rechercher</button></form><p role="status"></p><div id="boardingIdentityResults"></div></section>');
 const {createIdentityTicketUi}=await import('../src/identity-ticket-ui.js');let boardings=0;
 const ticket={id:'ticket',tripId:'trip',passengerName:'Client',origin:'Ouaga',destination:'Bobo',seat:'1',pnr:'PNR1',departureAt:new Date().toISOString(),balance:0};
 const ui=createIdentityTicketUi({state:{company:{id:'one'},user:{id:'agent'},page:'ticketBoarding'},esc:x=>String(x||''),notify(){},render(){},api:async path=>path.includes('/ocr')?{text:'PASSEPORT\nN° A12345678'}:{customerName:'Client',photo:PHOTO,tickets:[ticket]},boardTicket:async(id,tripId,number)=>{assert.equal(number,'A12345678');boardings++;return {ticket:{...ticket,boarded:true},alreadyBoarded:false};}});ui.bind();
 assert.equal(document.querySelector('input[type=file]'),null);document.querySelector('#boardingNativeCamera').click();await wait(()=>document.querySelector('[data-camera-shoot]')?.disabled===false);document.querySelector('[data-camera-shoot]').click();
 await wait(()=>document.querySelector('#boardingIdentityResults .primary'));assert.equal(boardings,0);assert.equal(document.querySelector('[name=number]').value,'A12345678');document.querySelector('#boardingIdentityResults .primary').click();await wait(()=>boardings===1);assert.ok(document.querySelector('#boardingIdentityResults .primary').disabled);
});
test('OCR : un préfixe contraire au type de pièce n’est pas proposé',async()=>{
 const {parseIdentityText,documentNumberKind}=await import('../src/identity-text.js');assert.equal(parseIdentityText('CNIB\nN° A12345678').primaryNumber,'');assert.equal(parseIdentityText('PASSEPORT\nN° B12345678').primaryNumber,'');assert.equal(documentNumberKind('B 1234 5678'),'CNIB');assert.equal(documentNumberKind('A12345678'),'Passeport');assert.equal(documentNumberKind('ZX123456'),'');
});
test('la carte encode les coordonnées et refuse les valeurs invalides',async()=>{
 const {mapEmbedUrl}=await import('../src/tracking-ui.js');assert.match(mapEmbedUrl(12.3,-1.5),/^https:\/\/www.openstreetmap.org\/export\/embed.html/);assert.equal(mapEmbedUrl('javascript:alert(1)',0),'');assert.equal(mapEmbedUrl(91,0),'');
});
test('la position web utilise la position réelle et traduit un refus',async()=>{
 dom();Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok){ok({coords:{latitude:12.3,longitude:-1.5,accuracy:10}});}},configurable:true});const {getCurrentLocation}=await import('../src/location.js');assert.equal((await getCurrentLocation()).coords.latitude,12.3);
 navigator.geolocation.getCurrentPosition=(_,error)=>error({code:1});await assert.rejects(getCurrentLocation(),/Autorisez la localisation/);
});
test('arrêter le suivi web arrête le watch et ignore les callbacks tardifs',async()=>{
 dom();let callback,cleared,received=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(fn){callback=fn;return 7;},clearWatch(id){cleared=id;}},configurable:true});const {watchLocation}=await import('../src/location.js');const watcher=watchLocation(()=>received++,()=>{});callback({coords:{latitude:12}});watcher.stop();callback({coords:{latitude:13}});assert.equal(cleared,7);assert.equal(received,1);
});
