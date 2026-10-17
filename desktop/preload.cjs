const { contextBridge, ipcRenderer } = require('electron');
const call = (channel) => (payload) => ipcRenderer.invoke(channel, payload);
contextBridge.exposeInMainWorld('yamDesktop', {
  platform: process.platform,
  prompt: (message,defaultValue='') => ipcRenderer.sendSync('yam:prompt',{message:String(message||''),defaultValue:String(defaultValue||'')}),
  nativePrinter: {
    printHtml: call('yam:print-html'),
    listPairedBluetoothPrinters: call('yam:printers'),
    printEscPosBluetooth: call('yam:print-ticket'),
    openPrintSettings: call('yam:printer-settings'),
    openBluetoothSettings: call('yam:bluetooth-settings'),
    openAppSettings: call('yam:camera-settings'),
    cameraPermissionStatus: call('yam:camera-status'),
    requestCameraPermission: async () => {
      const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      stream.getTracks().forEach(track => track.stop());
      return {granted:true};
    }
  }
});
