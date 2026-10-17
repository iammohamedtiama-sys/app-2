// Remove Electron Builder's temporary copies before creating the distributables.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..',process.argv[2]||'release-windows','win-unpacked');
if(!fs.existsSync(path.join(root,'YAM TRANS.exe')))throw new Error('Le programme Windows principal est absent.');
for(const name of fs.readdirSync(root)){
 if(name==='electron.exe'||/^\.(?:electron|YAM TRANS)\.exe\./.test(name)){
  const file=path.join(root,name);
  if(fs.statSync(file).isFile())fs.unlinkSync(file);
 }
}
