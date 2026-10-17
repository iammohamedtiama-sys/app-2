const { app, BrowserWindow, protocol, net, ipcMain, shell, dialog, session, Menu, systemPreferences } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ticketDocument } = require('./ticket.cjs');

protocol.registerSchemesAsPrivileged([{scheme:'yamtrans',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const APP_URL = 'yamtrans://app/';
let mainWindow;
const trusted = url => {try {const u=new URL(url);return u.protocol==='yamtrans:'&&u.hostname==='app';} catch {return false;}};
function handle(channel, fn) {
  ipcMain.handle(channel, async (event, payload) => {
    if (!trusted(event.senderFrame?.url||'')) throw new Error('Origine non autorisée');
    return fn(payload);
  });
}
async function printHtml(payload={}) {
  if(typeof payload.html!=='string'||payload.html.length>15*1024*1024)throw new Error('Document d’impression invalide');
  const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true,javascript:false,partition:'yam-print'}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.session.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith('data:')&&!details.url.startsWith(APP_URL)}));
  try {
    await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(payload.html));
    if(payload.title)win.setTitle(String(payload.title).slice(0,180));
    const options={silent:Boolean(payload.deviceName),printBackground:true,deviceName:String(payload.deviceName||''),usePrinterDefaultPageSize:false};
    if(payload.paperWidth){
      const height=await win.webContents.executeJavaScript('Math.ceil(document.body.scrollHeight / 96 * 25400)');
      options.pageSize={width:Number(payload.paperWidth)*1000,height:Math.min(3000000,Math.max(80000,height+5000))};
    }
    await new Promise((resolve,reject)=>win.webContents.print(options,(ok,reason)=>ok?resolve():reject(new Error(reason||'Impression annulée'))));
    return {success:true};
  } finally {win.destroy();}
}
function openExternal(url) {try{const u=new URL(url);if(['https:','http:','mailto:','tel:'].includes(u.protocol))return shell.openExternal(u.href);}catch{}return Promise.resolve();}
async function createWindow() {
  mainWindow=new BrowserWindow({width:1440,height:940,minWidth:900,minHeight:650,title:'YAM TRANS',backgroundColor:'#f5f7f8',show:false,icon:path.join(__dirname,'icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,nodeIntegration:false,contextIsolation:true,webSecurity:true}});
  mainWindow.webContents.setWindowOpenHandler(({url})=>{openExternal(url);return {action:'deny'};});
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!trusted(url)){event.preventDefault();openExternal(url);}});
  mainWindow.once('ready-to-show',()=>{mainWindow.maximize();mainWindow.show();});
  await mainWindow.loadURL(APP_URL);
}
app.setName('YAM TRANS');
app.setPath('userData',path.join(app.getPath('appData'),'YamTrans'));
if(process.env.YAMTRANS_USER_DATA)app.setPath('userData',path.resolve(process.env.YAMTRANS_USER_DATA));
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
  app.whenReady().then(async()=>{
    app.setAppUserModelId('com.yamtrans.desktop');
    const root=path.resolve(__dirname,'../dist');
    protocol.handle('yamtrans',request=>{
      const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});
      let relative;try{relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';}catch{return new Response('Bad request',{status:400});}
      const file=path.resolve(root,relative);if(file!==root&&!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
      return net.fetch(pathToFileURL(file).href);
    });
    session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>{
      if(!trusted(contents.getURL())||permission!=='media')return callback(false);
      dialog.showMessageBox(mainWindow,{type:'question',buttons:['Autoriser','Refuser'],defaultId:0,cancelId:1,title:'Caméra Yam-Trans',message:'Autoriser la caméra pour scanner les QR codes et photographier les bagages ?'}).then(({response})=>callback(response===0)).catch(()=>callback(false));
    });
    session.defaultSession.setPermissionCheckHandler((contents,permission,origin)=>permission==='media'&&trusted(contents?.getURL()||origin));
    session.defaultSession.on('will-download',(_event,item)=>{
      item.setSaveDialogOptions({title:'Enregistrer le document Yam-Trans',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});
    });
    handle('yam:printers',async()=>({devices:(await mainWindow.webContents.getPrintersAsync()).map(p=>({name:p.displayName||p.name,address:p.name,isDefault:p.isDefault}))}));
    handle('yam:print-html',printHtml);
    handle('yam:print-ticket',async p=>{
      if(!p||typeof p.address!=='string')throw new Error('Imprimante requise');
      const printers=await mainWindow.webContents.getPrintersAsync();
      if(!printers.some(printer=>printer.name===p.address))throw new Error('Cette imprimante doit être installée dans Windows avant utilisation.');
      return printHtml({html:ticketDocument(p),deviceName:p.address,paperWidth:Number(p.paperWidth)===58?58:80,title:p.code||'Yam-Trans'});
    });
    const settings=uri=>process.platform==='win32'?shell.openExternal(uri):Promise.resolve();
    handle('yam:printer-settings',()=>settings('ms-settings:printers'));
    handle('yam:bluetooth-settings',()=>settings('ms-settings:bluetooth'));
    handle('yam:camera-settings',()=>settings('ms-settings:privacy-webcam'));
    handle('yam:camera-status',()=>({state:systemPreferences.getMediaAccessStatus('camera')}));
    ipcMain.on('yam:prompt',(event,payload={})=>{
      if(!trusted(event.senderFrame?.url||'')){event.returnValue=null;return;}
      const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
      const win=new BrowserWindow({width:520,height:245,resizable:false,parent:mainWindow,modal:true,autoHideMenuBar:true,title:'Yam-Trans',webPreferences:{preload:path.join(__dirname,'prompt-preload.cjs'),sandbox:true,nodeIntegration:false,contextIsolation:true}});
      let finished=false;
      const finish=value=>{if(finished)return;finished=true;ipcMain.removeListener('yam:prompt-result',receive);event.returnValue=value;if(!win.isDestroyed())win.close();};
      const receive=(response,value)=>{if(response.sender===win.webContents)finish(value===null?null:String(value).slice(0,10000));};
      ipcMain.on('yam:prompt-result',receive);win.on('closed',()=>finish(null));
      win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      win.webContents.on('will-navigate',e=>e.preventDefault());
      win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<!doctype html><meta charset="utf-8"><style>body{font:15px Arial;padding:20px;color:#173247}label{display:block;margin-bottom:15px}input{box-sizing:border-box;width:100%;padding:10px;border:1px solid #aaa;border-radius:6px}footer{text-align:right;margin-top:20px}button{padding:9px 20px;margin-left:10px;border:1px solid #ccc;border-radius:6px}button[type=submit]{background:#075f4e;color:white}</style><form><label for="value">${esc(String(payload.message||'').slice(0,2000))}</label><input id="value" value="${esc(String(payload.defaultValue||'').slice(0,10000))}"><footer><button id="cancel" type="button">Annuler</button><button type="submit">Valider</button></footer></form>`)).catch(()=>finish(null));
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'Yam-Trans',submenu:[{label:'Imprimer la page',accelerator:'CmdOrCtrl+P',click:()=>mainWindow.webContents.print({printBackground:true})},{type:'separator'},{role:'quit',label:'Quitter'}]},
      {label:'Édition',submenu:[{role:'undo',label:'Annuler'},{role:'redo',label:'Rétablir'},{type:'separator'},{role:'cut',label:'Couper'},{role:'copy',label:'Copier'},{role:'paste',label:'Coller'},{role:'selectAll',label:'Tout sélectionner'}]},
      {label:'Affichage',submenu:[{role:'reload',label:'Actualiser'},{role:'resetZoom',label:'Taille réelle'},{role:'zoomIn',label:'Agrandir'},{role:'zoomOut',label:'Réduire'},{role:'togglefullscreen',label:'Plein écran'}]}
    ]));
    await createWindow();
  }).catch(error=>{dialog.showErrorBox('Yam-Trans',error.message);app.quit();});
  app.on('window-all-closed',()=>app.quit());
}
