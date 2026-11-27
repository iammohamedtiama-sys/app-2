"""Package a web build into an existing compatible Capacitor shell; signing is separate.
No dex/native library is recompiled. Set a new package and label for an isolated traveller app.
"""
import argparse
from pathlib import Path
import re
import struct as S
from zipfile import ZipFile
p=argparse.ArgumentParser();p.add_argument('--base-apk',required=True);p.add_argument('--web-dir',required=True);p.add_argument('--output',required=True);p.add_argument('--version-code',required=True,type=int);p.add_argument('--version-name',required=True);p.add_argument('--package');p.add_argument('--label');a=p.parse_args()
def chunks(b,start=8):
    while start<len(b):
        kind,head,size=S.unpack_from('<HHI',b,start)
        assert size>=head and size>0
        yield kind,head,bytearray(b[start:start+size]);start+=size

def decode_pool(b):
    count,styles,flags,start,style_start=S.unpack_from('<IIIII',b,8);utf8=flags&256
    assert not styles,'Manifest styled strings unsupported'
    offsets=S.unpack_from('<'+'I'*count,b,28);out=[]
    def length(pos,wide=False):
        fmt='<H' if wide else '<B';step=2 if wide else 1;mask=0x8000 if wide else 0x80
        x=S.unpack_from(fmt,b,pos)[0];pos+=step
        if x&mask:x=((x&(mask-1))<<(16 if wide else 8))|S.unpack_from(fmt,b,pos)[0];pos+=step
        return x,pos
    for off in offsets:
        pos=start+off;n,pos=length(pos,not utf8)
        if utf8:n,pos=length(pos)
        out.append(bytes(b[pos:pos+n*(1 if utf8 else 2)]).decode('utf-8' if utf8 else 'utf-16-le'))
    return out,utf8

def encode_pool(strings,utf8):
    offsets=[];data=b''
    def length(n,wide=False):
        if wide:return S.pack('<H',n) if n<32768 else S.pack('<HH',0x8000|(n>>16),n&65535)
        return bytes([n]) if n<128 else bytes([128|(n>>8),n&255])
    for s in strings:
        offsets.append(len(data));n=len(s.encode('utf-16-le'))//2
        data+=length(n,not utf8)
        if utf8:
            raw=s.encode();data+=length(len(raw))+raw+b'\0'
        else:data+=s.encode('utf-16-le')+b'\0\0'
    data+=b'\0'*((-len(data))%4);start=28+4*len(strings)
    return S.pack('<HHIIIIII',1,28,start+len(data),len(strings),0,256 if utf8 else 0,start,0)+S.pack('<'+'I'*len(strings),*offsets)+data

with ZipFile(a.base_apk) as base:
    manifest=base.read('AndroidManifest.xml');parts=list(chunks(manifest));pool=next(x for x in parts if x[0]==1);strings,utf8=decode_pool(pool[2]);original=strings[:]
    resource_ids=next(S.unpack_from('<'+'I'*((len(b)-h)//4),b,h) for k,h,b in parts if k==0x180)
    old_package=None
    for k,h,b in parts:
        if k!=0x102:continue
        name=strings[S.unpack_from('<I',b,20)[0]];start,size,count=S.unpack_from('<HHH',b,24)
        for i in range(count):
            pos=16+start+i*size;idx=S.unpack_from('<I',b,pos+4)[0];attr=strings[idx];rid=resource_ids[idx] if idx<len(resource_ids) else 0
            if name=='manifest' and attr=='package':old_package=strings[S.unpack_from('<I',b,pos+16)[0]]
            if rid==0x0101021b:S.pack_into('<I',b,pos+16,a.version_code)
            if rid==0x0101021c:
                value=S.unpack_from('<I',b,pos+16)[0];strings[value]=a.version_name
            if a.label and name in ('application','activity') and rid==0x01010001:
                label_idx=len(strings);strings.append(a.label);S.pack_into('<I',b,pos+8,label_idx);b[pos+15]=3;S.pack_into('<I',b,pos+16,label_idx)
    if a.package:
        assert old_package
        strings=[s.replace(old_package,a.package) for s in strings]
    output=[];skip=0
    for k,h,b in parts:
        if k==1:output.append(encode_pool(strings,utf8));continue
        if a.package and k==0x102:
            name=original[S.unpack_from('<I',b,20)[0]]
            if name=='uses-permission':
                start,size,count=S.unpack_from('<HHH',b,24)
                names=[original[S.unpack_from('<I',b,16+start+i*size+16)[0]] for i in range(count) if original[S.unpack_from('<I',b,16+start+i*size+4)[0]]=='name']
                if any(n.startswith('android.permission.') and n not in {'android.permission.INTERNET','android.permission.ACCESS_NETWORK_STATE'} for n in names):skip=1;continue
        if skip:
            if k==0x102:skip+=1
            if k==0x103:skip-=1
            continue
        output.append(b)
    body=b''.join(output);manifest=manifest[:4]+S.pack('<I',8+len(body))+body
    dest=Path(a.output);dest.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(dest,'w') as out:
        for info in base.infolist():
            if info.filename.startswith('assets/public/') or re.fullmatch(r'META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))',info.filename,re.I):continue
            data=manifest if info.filename=='AndroidManifest.xml' else base.read(info.filename)
            if a.package and info.filename=='assets/capacitor.config.json':
                import json
                cfg=json.loads(data);cfg.update(appId=a.package,appName=a.label or cfg.get('appName'));data=json.dumps(cfg).encode()
            out.writestr(info,data)
        for f in Path(a.web_dir).rglob('*'):
            if f.is_file():out.write(f,'assets/public/'+f.relative_to(a.web_dir).as_posix())
        for name in ('cordova.js','cordova_plugins.js'):out.writestr('assets/public/'+name,b'')
print('Packaged web assets; native bytecode unchanged:',a.output)
