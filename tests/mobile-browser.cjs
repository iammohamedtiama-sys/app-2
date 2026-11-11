/* Real browser + real temporary API. Camera video and OCR text are controlled test inputs. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),serverRoot=process.env.YAMTRANS_TEST_SERVER||path.resolve(root,'../Yam-trans');
const python=process.env.YAMTRANS_TEST_PYTHON||'python3',temp=fs.mkdtempSync(path.join(os.tmpdir(),'yam-mobile-'));
const base='http://127.0.0.1:8793',env={...process.env,DATABASE_URL:'sqlite:///'+path.join(temp,'test.db'),TOKEN_SECRET:'mobile-test-only',PUBLIC_BASE_URL:base,WEBAPP_DIR:path.join(serverRoot,'frontend/dist')};
let server,browser,page;
async function api(url,body,token,method=body===undefined?'GET':'POST'){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
async function navigate(name){
 await page.locator('#closeTicketModal').click({timeout:400}).catch(()=>{});
 if(await page.locator('#mobileFullMenu').isVisible()){
  await page.locator('#mobileFullMenu').click();await page.locator('#fullMenuHost [data-page='+name+']').click();
 }else await page.locator('aside [data-page='+name+']').first().click();
}
async function noOverflow(label){const size=await page.evaluate(()=>({screen:innerWidth,body:document.documentElement.scrollWidth}));assert.ok(size.body<=size.screen+1,label+' '+JSON.stringify(size));}
(async()=>{
 execFileSync(python,['-c',"from app import main as m\nwith m.SessionLocal() as db:\n c=db.scalar(m.select(m.Company).where(m.Company.code=='YAMTRANS'));c.settings={**c.settings,'modules':{'courier':True,'baggage':True,'tickets':True}};db.commit()"],{cwd:serverRoot,env});
 server=spawn(python,['-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8793'],{cwd:serverRoot,env,stdio:'ignore'});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Server did not start');
 const login=await api('/api/v2/auth/login',{company:'YAMTRANS',username:'admin',password:'admin123'});
 const departure=new Date(Date.now()+30*60000).toISOString(),seats=[];
 for(let i=1;i<=12;i++)seats.push({id:'V'+i,label:'V'+i,class:'VIP',row:Math.ceil(i/3),col:((i-1)%3)+1});
 for(let i=1;i<=40;i++)seats.push({id:'S'+i,label:String(i),class:'Simple',row:4+Math.ceil(i/4),col:((i-1)%4)+1});
 await api('/api/v2/sync',{deviceId:'browser',entities:{ticket_buses:[{id:'bus',name:'Bus Ouaga Bobo',registration:'BF-MOBILE',seats}],ticket_routes:[{id:'route',origin:'Ouaga',destination:'Bobo',stops:'Boromo',fareSimple:5000,fareVip:7000,fareChildSimple:2500,fareChildVip:4000}],ticket_trips:[{id:'trip',routeId:'route',busId:'bus',origin:'Ouaga',destination:'Bobo',stops:'Boromo',departureAt:departure,status:'Publié',fareSimple:5000,fareVip:7000}]}},login.token);
 let launch={headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']};
 if(process.env.YAMTRANS_CHROMIUM_MODULE){const {default:chr}=await import(process.env.YAMTRANS_CHROMIUM_MODULE);launch={...launch,executablePath:await chr.executablePath(),args:[...chr.args,...launch.args]};}
 else if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;
 browser=await chromium.launch(launch);const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,permissions:['camera','geolocation'],geolocation:{latitude:12.3,longitude:-1.5,accuracy:10},acceptDownloads:true});
 await context.addInitScript(base=>localStorage.setItem('yamtransServerUrl',base),base);
 await context.route('**/*',route=>{const url=route.request().url();return url.startsWith(base)||url.startsWith('data:')?route.continue():route.fulfill({status:200,contentType:'text/html',body:'<p>Map tile test</p>'});});
 page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/app/');await page.locator('#loginForm [name=company]').fill('YAMTRANS');await page.locator('#loginForm [name=username]').fill('admin');await page.locator('#loginForm [name=password]').fill('admin123');await page.locator('#loginForm [type=submit]').click();
 await page.locator('#mobileFullMenu').waitFor();await navigate('ticketSale');
 assert.ok((await page.locator('.mobile-nav').innerText()).includes('Vendre'));
 for(const width of [320,360,390,430,768,1280]){
  await page.setViewportSize({width,height:900});await noOverflow('sale '+width);
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#saleTrip').selectOption('trip');await page.locator('#openMobileSeats').click();await page.locator('[data-seat="1"]').click();await page.waitForFunction(()=>document.querySelector('#selectedSeat')?.value==='1');await page.locator('.seat-sheet-open').waitFor({state:'detached'});
 await page.locator('#ticketCustomerPhone').fill('70000001');await page.locator('#ticketPassengerName').fill('Client mobile');await page.locator('#ticketSaleForm [name=paid]').fill('1000');
 assert.equal(await page.locator('#ticketSaleForm input[type=file]').count(),0);
 await page.route('**/api/v2/operations/documents/ocr',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'CNIB\nN° B12345678\nNom CLIENT\nPrénoms MOBILE'})}));
 await page.locator('#saleNativeCamera').tap();await page.locator('[data-camera-shoot]:not([disabled])').waitFor();await noOverflow('camera');
 await page.locator('[data-camera-shoot]').tap();await page.waitForFunction(()=>document.querySelector('#ticketSaleForm [name=documentNumber]')?.value==='B12345678');
 await page.locator('#saleIdentityConfirmed').check();
 if(process.env.YAMTRANS_SCREENSHOT_DIR){fs.mkdirSync(process.env.YAMTRANS_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.YAMTRANS_SCREENSHOT_DIR,'mobile-sale.png'),fullPage:true});}
 await page.locator('#ticketSaleForm button.submit').tap();await page.waitForFunction(()=>{const cid=JSON.parse(localStorage.getItem('currentCompanyId'));return JSON.parse(localStorage.getItem('yamtrans:'+cid+':tickets')||'[]').length===1;});
 await page.waitForFunction(()=>document.querySelector('#ytToastHost')?.textContent.includes('émis · siège'));
 await navigate('ticketBookings');await page.locator('[data-ticket-open]').first().click();await page.locator('[data-settle-ticket]').click();await page.locator('#ticketPaymentForm [type=submit]').click();await page.waitForFunction(()=>!document.querySelector('#ticketPaymentForm'));
 await navigate('ticketBoarding');await page.locator('#boardingTrip').selectOption('trip');await page.locator('#scanTicketQr').tap();await page.locator('[data-camera-shoot]:not([disabled])').waitFor();await page.locator('[data-camera-shoot]').tap();await page.locator('#boardingIdentityResults .primary').waitFor();
 assert.equal(await page.locator('#boardingIdentity input[type=file]').count(),0);await page.locator('#boardingIdentityResults .primary').tap();await page.waitForFunction(()=>document.querySelector('#boardingIdentity [role=status]')?.textContent.includes('embarquement confirmé'));
 page.once('dialog',dialog=>dialog.accept('B12345678'));await page.locator('#manualPnr').click();await page.waitForFunction(()=>document.querySelector('#boardingIdentityResults')?.textContent.includes('Déjà embarqué'));
 const synced=await api('/api/v2/sync',{deviceId:'browser',entities:{}},login.token);assert.equal(synced.entities.tickets[0].paid,5000);assert.equal(synced.entities.ticket_boardings.length,1);
 const gps=await api('/api/v2/gps/devices',{busId:'bus',label:'Test GPS'},login.token);
 await api('/api/v2/gps/positions',{id:'test-position',recordedAt:new Date().toISOString(),latitude:12.3,longitude:-1.5,speedKph:40},gps.token);
 await navigate('ticketTracking');await page.locator('.gps-map').waitFor();await noOverflow('gps');assert.ok((await page.locator('.gps-fresh').first().innerText()).includes('Boîtier GPS'));
 if(process.env.YAMTRANS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.YAMTRANS_SCREENSHOT_DIR,'mobile-gps.png'),fullPage:true});
 await page.locator('#gpsPhoneTrip').selectOption('trip');await page.locator('#gpsPhone').click();await page.waitForFunction(()=>document.querySelector('#ytToastHost')?.textContent.includes('Position transmise'));
 for(const name of ['ticketDashboard','ticketReservations','ticketBookings','ticketFleet','ticketManifest','ticketBaggage','ticketCustomers','ticketReports','ticketOperations','ticketPilotage','ticketExtensions']){
  await navigate(name);await noOverflow(name);
 }
 await navigate('admin');await page.locator('[data-settings-section=users]').click();
 const userForm=page.locator('#userForm');await userForm.locator('[name=name]').fill('Convoyeur E2E');await userForm.locator('[name=username]').fill('convoyeur-e2e');await userForm.locator('[name=password]').fill('test-password-123');await userForm.locator('[name=operationalProfile]').selectOption('conductor');
 await userForm.locator('button.primary').last().click();await page.waitForFunction(()=>document.querySelector('#ytToastHost')?.textContent.includes('Utilisateur créé'));
 const bootstrap=await api('/api/v2/admin/bootstrap',undefined,login.token);const convoyeur=bootstrap.users.find(u=>u.username==='convoyeur-e2e');assert.ok(convoyeur);assert.equal(convoyeur.modules.permissions['tickets.sell'],true);assert.equal(convoyeur.modules.permissions['payroll.pay'],false);
 const driver=await api('/api/v2/admin/users',{name:'Chauffeur E2E',username:'driver-e2e',password:'test-password-123',role:'agency',agency:'Toutes',modules:{courier:false,baggage:false,tickets:true,ticketRoles:['driver'],profile:'driver'}},login.token);
 // Refresh the local staff list through the real synchronization protocol.
 await page.reload();await page.locator('[data-page=ticketDashboard]').first().waitFor({state:'attached'});
 await navigate('staffManagement');await page.locator('#managementAssign').waitFor();
 await page.locator('#managementAssign [name=tripId]').selectOption('trip');await page.locator('#managementAssign [name=driverId]').selectOption(driver.id);await page.locator('#managementAssign [name=conductorId]').selectOption(convoyeur.id);await page.locator('#managementAssign button').click();await page.getByText('Convoyeur E2E',{exact:true}).last().waitFor();
 await navigate('payrollManagement');await page.locator('#managementContract').waitFor();
 await page.locator('#managementContract [name=userId]').selectOption(convoyeur.id);await page.locator('#managementContract [name=monthlyBase]').fill('100000');await page.locator('#managementContract [name=perTrip]').fill('5000');await page.locator('#managementContract button').click();await page.getByText(/100.*000.*5.*000/).first().waitFor();
 await page.locator('#managementPayroll [name=userId]').selectOption(convoyeur.id);await page.locator('#managementPayroll [name=month]').fill(new Date().toISOString().slice(0,7));await page.locator('#managementPayroll button').click();await page.locator('[data-payroll-approve]').waitFor();await page.locator('[data-payroll-approve]').click();await page.locator('[data-payroll-pay]').waitFor();await page.locator('[data-payroll-pay]').click();
 const payDialog=page.getByRole('dialog',{name:'Enregistrer un paiement de salaire'});await payDialog.locator('[name=paymentMethod]').selectOption('Mobile Money');await payDialog.locator('[name=reference]').fill('E2E-RECEIPT');await payDialog.locator('input[type=checkbox]').check();await payDialog.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('main')?.textContent.includes('Payée'));
 const salary=await api('/api/v2/management/payroll',undefined,login.token);assert.equal(salary.payroll[0].status,'Payée');assert.equal(salary.payroll[0].paymentMethod,'Mobile Money');
 await api('/api/v2/gps/positions',{id:'speed-1',tripId:'trip',recordedAt:new Date().toISOString(),latitude:12.3,longitude:-1.5,speedKph:120,accuracy:5},gps.token);
 await new Promise(resolve=>setTimeout(resolve,11000));
 await api('/api/v2/gps/positions',{id:'speed-2',tripId:'trip',recordedAt:new Date().toISOString(),latitude:12.3,longitude:-1.5,speedKph:125,accuracy:5},gps.token);
 await navigate('managementInsights');await page.getByText('Priorités à examiner',{exact:true}).waitFor();await noOverflow('management-insights');await page.getByText('Dépassement de vitesse GPS à vérifier',{exact:true}).waitFor();await navigate('staffManagement');await page.locator('#managementAssign').waitFor();await noOverflow('staff');await navigate('payrollManagement');await page.locator('#managementPayroll').waitFor();await noOverflow('payroll');assert.deepEqual(errors,[]);console.log('MOBILE_BROWSER_OK: widths 320/360/390/430/768/1280, 52 seats, real camera API with test video, CNIB sale, balance payment, document boarding twice, live GPS hardware/phone map, all Tickets pages, conductor permissions, crew assignment, payroll preparation/approval/payment and overspeed alerts');
})().catch(async error=>{console.error(error);if(page){console.error((await page.locator('body').innerText().catch(()=>'' )).slice(-2600));if(process.env.YAMTRANS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.YAMTRANS_SCREENSHOT_DIR,'failure.png'),fullPage:true}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();fs.rmSync(temp,{recursive:true,force:true});});
