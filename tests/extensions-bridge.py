import os,json,tempfile,sys
from pathlib import Path
folder=tempfile.TemporaryDirectory()
os.environ['DATABASE_URL']='sqlite:///'+folder.name+'/ui.db'
os.environ['TOKEN_SECRET']='ui-only'
sys.path.insert(0,os.environ.get('YAMTRANS_TEST_SERVER',str(Path(__file__).resolve().parents[2] / 'Yam-trans')))
from app import main as m
from fastapi.testclient import TestClient
client=TestClient(m.app)
with m.SessionLocal() as db:
 c=db.scalar(m.select(m.Company).where(m.Company.code=='YAMTRANS'))
 c.settings={**c.settings,'modules':{'tickets':True,'courier':True,'baggage':True}}
 db.commit()
for line in sys.stdin:
 try:
  req=json.loads(line);r=client.request(req.get('method','GET'),req['path'],headers=req.get('headers',{}),json=req.get('body'))
  print(json.dumps({'id':req['id'],'status':r.status_code,'body':r.json()}),flush=True)
 except Exception as e:print(json.dumps({'id':req.get('id'),'status':500,'body':{'detail':str(e)}}),flush=True)
