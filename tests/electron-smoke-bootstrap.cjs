const {app}=require('electron');
// Only the Linux test harness replaces the unavailable single-instance socket.
app.requestSingleInstanceLock=()=>true;
require('../desktop/main.cjs');
