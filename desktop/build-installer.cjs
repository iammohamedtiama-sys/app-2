const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json');
const release=path.join(root,'release-windows'),appDir=path.join(release,'win-unpacked');
const exe=path.join(release,`YamTrans-${pkg.version}-Windows-Installation.exe`);
const quote=s=>String(s).replaceAll('$','$$').replaceAll('"','$\\"');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.relative(appDir,path.join(dir,e.name))]);}
const files=walk(appDir),dirs=[...new Set(files.flatMap(f=>{let d=path.dirname(f),a=[];while(d!=='.'){a.push(d);d=path.dirname(d);}return a;}))].sort((a,b)=>b.length-a.length);
const installed=f=>'$INSTDIR\\'+quote(f.replaceAll(path.sep,'\\'));
const script=`Unicode true
!include "MUI2.nsh"
Name "YAM TRANS"
OutFile "${quote(exe)}"
InstallDir "$LOCALAPPDATA\\Programs\\YamTrans"
InstallDirRegKey HKCU "Software\\YamTrans" "InstallDir"
RequestExecutionLevel user
SetCompressor zlib
VIProductVersion "${pkg.version}.0"
VIAddVersionKey /LANG=1036 "ProductName" "YAM TRANS"
VIAddVersionKey /LANG=1036 "FileDescription" "Installation de Yam-Trans pour Windows"
VIAddVersionKey /LANG=1036 "FileVersion" "${pkg.version}"
VIAddVersionKey /LANG=1036 "LegalCopyright" "Yam-Trans"
!define MUI_ICON "${quote(path.join(__dirname,'icon.ico'))}"
!define MUI_UNICON "${quote(path.join(__dirname,'icon.ico'))}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\\YAM TRANS.exe"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "French"
Section "Installation"
SetShellVarContext current
SetOutPath "$INSTDIR"
File /r "${quote(appDir)}${path.sep}*"
WriteUninstaller "$INSTDIR\\Desinstaller.exe"
CreateShortcut "$DESKTOP\\YAM TRANS.lnk" "$INSTDIR\\YAM TRANS.exe"
CreateDirectory "$SMPROGRAMS\\YAM TRANS"
CreateShortcut "$SMPROGRAMS\\YAM TRANS\\YAM TRANS.lnk" "$INSTDIR\\YAM TRANS.exe"
CreateShortcut "$SMPROGRAMS\\YAM TRANS\\Désinstaller.lnk" "$INSTDIR\\Desinstaller.exe"
WriteRegStr HKCU "Software\\YamTrans" "InstallDir" "$INSTDIR"
WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans" "DisplayName" "YAM TRANS"
WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans" "DisplayVersion" "${pkg.version}"
WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans" "Publisher" "Yam-Trans"
WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans" "UninstallString" '$\\"$INSTDIR\\Desinstaller.exe$\\"'
WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans" "DisplayIcon" "$INSTDIR\\YAM TRANS.exe"
WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans" "NoModify" 1
WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans" "NoRepair" 1
SectionEnd
Section "Uninstall"
SetShellVarContext current
${files.map(f=>'Delete "'+installed(f)+'"').join('\n')}
Delete "$INSTDIR\\Desinstaller.exe"
${dirs.map(d=>'RMDir "'+installed(d)+'"').join('\n')}
RMDir "$INSTDIR"
Delete "$DESKTOP\\YAM TRANS.lnk"
Delete "$SMPROGRAMS\\YAM TRANS\\YAM TRANS.lnk"
Delete "$SMPROGRAMS\\YAM TRANS\\Désinstaller.lnk"
RMDir "$SMPROGRAMS\\YAM TRANS"
DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\YamTrans"
DeleteRegKey HKCU "Software\\YamTrans"
SectionEnd
`;
const scriptFile=path.join(release,'installer-generated.nsi');fs.writeFileSync(scriptFile,script);
function findCompiler(dir){if(!fs.existsSync(dir))return null;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isFile()&&entry.name===(process.platform==='win32'?'makensis.exe':'makensis')&&(process.platform==='win32'||path.basename(dir)===(process.platform==='darwin'?'mac':'linux')))return p;if(entry.isDirectory()){const hit=findCompiler(p);if(hit)return hit;}}return null;}
const cache=process.env.ELECTRON_BUILDER_CACHE||(process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'electron-builder','Cache'):process.platform==='darwin'?path.join(os.homedir(),'Library','Caches','electron-builder'):path.join(os.homedir(),'.cache','electron-builder'));
const compiler=process.env.MAKENSIS_PATH||findCompiler(cache);
if(!compiler)throw Error('Compilateur NSIS introuvable. Exécuter la compilation portable avant cet installateur.');
const result=spawnSync(compiler,['-V2',scriptFile],{stdio:'inherit',env:{...process.env,NSISDIR:path.resolve(path.dirname(compiler),'..')}});
if(result.status!==0)process.exit(result.status||1);
console.log('Installateur Windows : '+exe);
