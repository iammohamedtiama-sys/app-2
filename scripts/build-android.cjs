const {spawnSync}=require('node:child_process');
const path=require('node:path');
const win=process.platform==='win32';
const result=spawnSync(win?'cmd':'bash',win?['/c','gradlew.bat',':app:assembleDebug','--no-daemon']:['gradlew',':app:assembleDebug','--no-daemon'],{cwd:path.join(__dirname,'../android'),env:process.env,stdio:'inherit'});
process.exit(result.status??1);
