const {app,dialog}=require('electron');
dialog.showMessageBox=async()=>({response:0});
// Only the Linux test harness replaces the unavailable single-instance socket.
app.requestSingleInstanceLock=()=>true;
require('../desktop/main.cjs');
