"""Label-only browser regression. Actual shipped HTML, canvas, and touch events.
No synthetic artwork or substitute renderer. Origin reload / physical Android not tested.
"""
from pathlib import Path
import os, json, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
HTML=ROOT/'Shadowveil_Character_Driver_Foundation.html'
OLD=Path(os.environ.get('PREVIOUS_DRIVER_HTML','/mnt/data/Shadowveil_Character_Driver_Direction_Fix.html'))
OUT=ROOT/'verification-labels';OUT.mkdir(exist_ok=True)
report={'htmlSha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'checks':[],'errors':[],
 'environment':{'browser':'Chromium','exactHTMLViaSetContent':True,'emulatedMobileTouch':True,'physicalAndroid':False,'fullViteBuild':False,'originReloadTested':False}}
def check(name,ok,detail=None):
 entry={'name':name,'pass':bool(ok)}
 if detail is not None:entry['detail']=detail
 report['checks'].append(entry);print(('PASS' if ok else 'FAIL'),name,flush=True)
def wait(p):p.wait_for_timeout(180)
def project(p):return p.evaluate('characterDriver.getProject()')
def metrics(p):return p.evaluate('characterDriver.metrics()')
def pixelhash(p):return p.evaluate('''()=>{const c=characterDriver.canvas, a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619);return [c.width,c.height,h>>>0];}''')
def handle(p,id):return next(h for h in metrics(p)['handles'] if h['id']==id)
def select(p,id):p.select_option('[data-bone]',id);wait(p)
def canvas_text(p):return p.evaluate('characterDriver.canvas.__labelTexts || []')
def scene_state(p):
 d=project(p);return {k:d[k] for k in ['driver','pose','registration','assetSetId']}|{'selectedBone':d['workspace']['selectedBone'],'camera':d['workspace']['camera']}
def open_page(ctx,html):
 p=ctx.new_page();p.on('pageerror',lambda e:report['errors'].append(str(e)))
 p.set_content(html.read_text(),wait_until='load');p.wait_for_function('()=>window.driverReady===true');wait(p)
 return p
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  ctx=b.new_context(viewport={'width':430,'height':1160},device_scale_factor=1.5,is_mobile=True,has_touch=True,accept_downloads=True)
  old=open_page(ctx,OLD)
  old.evaluate('characterDriver.setOverlay(true);characterDriver.setCamera({yaw:6,pitch:4})');old.click('[data-action="gesture"]');select(old,'hand-L')
  old_hint=old.locator('[data-bone-hint]').inner_text();old_m=metrics(old)
  check('Reproduced screenshot mismatch: screen-right wrist displayed anatomical Her left', 'Her left · Wrist' in old_hint and next(h for h in old_m['handles'] if h['id']=='hand-L')['screenSide']=='screen-right')
  old.evaluate('characterDriver.setOverlay(false)');wait(old)
  old_art=pixelhash(old);old_project=project(old);old_export=old.evaluate('characterDriver.exportProject()')
  (OUT/'previous-project-export.character.json').write_text(old_export)
  p=open_page(ctx,HTML)
  # Record actual canvas fillText calls without changing their execution or output.
  p.evaluate('''()=>{const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,fill=proto.fillText;
   proto.clearRect=function(...a){this.canvas.__labelTexts=[];return clear.apply(this,a)};
   proto.fillText=function(t,x,y,...a){(this.canvas.__labelTexts??=[]).push({text:t,x,y,width:this.measureText(t).width});return fill.call(this,t,x,y,...a)};
  }''')
  check('New and legacy projects use SCREEN labels by default',project(p)['workspace']['labelBasis']=='screen' and p.input_value('[data-label-basis]')=='screen')
  p.evaluate('(t)=>characterDriver.importProject(t)',old_export);wait(p)
  d=project(p)
  check('Old project import adds screen preference without moving pose, camera, selection or bindings', d['workspace']['labelBasis']=='screen' and all(d[k]==old_project[k] for k in ['driver','pose','registration','assetSetId']) and d['workspace']['camera']==old_project['workspace']['camera'] and d['workspace']['selectedBone']==old_project['workspace']['selectedBone'])
  check('Artwork-only pixels match the prior build exactly at identical pose/view/viewport',pixelhash(p)==old_art,{'before':old_art,'after':pixelhash(p)})
  p.evaluate('characterDriver.setOverlay(true)');select(p,'hand-L')
  h=handle(p,'hand-L');texts=canvas_text(p)
  check('On-canvas screen-right wrist label is Screen right · Wrist',h['label']=='Screen right · Wrist' and any(t['text']==h['label'] for t in texts))
  check('Shoulder markers use Screen L on image-left and Screen R on image-right',all(any(t['text']==s for t in texts) for s in ['Screen L','Screen R']))
  check('Dropdown and inspector agree with the visible screen-right label',p.locator('[data-bone] option:checked').inner_text().startswith('Screen right · Wrist') and p.locator('[data-bone-hint]').inner_text().startswith('Screen right · Wrist'))
  check('Anatomical ID remains explicit and unchanged in details', 'Character left · Wrist · ID: hand-L' in p.locator('[data-bone-hint]').inner_text() and project(p)['workspace']['selectedBone']=='hand-L')
  check('Canvas label is completely within the mobile viewport',all(0<=t['x'] and t['x']+t['width']<=p.locator('canvas').bounding_box()['width'] for t in texts if t['text']=='Screen right · Wrist'))
  p.screenshot(path=str(OUT/'01-screen-right-wrist-mobile.png'),full_page=False)
  p.locator('.cd-stage').screenshot(path=str(OUT/'02-screen-right-wrist-stage.png'))
  select(p,'hand-R')
  check('Screen-left wrist is labeled Screen left · Wrist', handle(p,'hand-R')['label']=='Screen left · Wrist' and any(t['text']=='Screen left · Wrist' for t in canvas_text(p)))
  select(p,'hand-L');snapshot=scene_state(p)
  p.select_option('[data-label-basis]','anatomical');wait(p)
  check('Anatomical option explicitly says Character left, not bare L',handle(p,'hand-L')['label']=='Character left · Wrist' and any(t['text']=='Character left · Wrist' for t in canvas_text(p)))
  check('Changing convention never swaps selected ID, driver, camera, pose or registration',scene_state(p)==snapshot)
  p.screenshot(path=str(OUT/'03-anatomical-option-mobile.png'),full_page=False)
  p.select_option('[data-label-basis]','screen');p.evaluate('characterDriver.setCamera({yaw:180,pitch:0})');wait(p)
  check('Back view reverses displayed screen location without changing anatomical selection',handle(p,'hand-L')['label']=='Screen left · Wrist' and project(p)['workspace']['selectedBone']=='hand-L')
  check('Dropdown text updates when camera turns',p.locator('[data-bone] option:checked').inner_text().startswith('Screen left · Wrist'))
  p.screenshot(path=str(OUT/'04-back-view-labels-driver-only.png'),full_page=False)
  # Neutral profile has truly overlapping left/right pairs.
  p.click('[data-action="neutral"]');p.evaluate('characterDriver.setCamera({yaw:90,pitch:0})');select(p,'hand-L')
  check('Side-on overlapping joints are not assigned a false left/right',handle(p,'hand-L')['label']=='Screen overlap · Wrist' and any(t['text']=='Screen overlap · Wrist' for t in canvas_text(p)))
  p.evaluate('(t)=>characterDriver.importProject(t)',old_export);p.evaluate('characterDriver.setOverlay(true)');select(p,'hand-L')
  # Real Chromium mobile touch. Stored pointer positions are CSS-pixel coordinates.
  client=ctx.new_cdp_session(p)
  for dx in [-5,5]:
   p.evaluate('(t)=>characterDriver.importProject(t)',old_export);p.evaluate('characterDriver.setOverlay(true)');select(p,'hand-L')
   p.locator('canvas').scroll_into_view_if_needed();wait(p)
   h=handle(p,'hand-L');rect=p.locator('canvas').bounding_box();x=rect['x']+h['x'];y=rect['y']+h['y'];before=project(p)['pose']
   client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});wait(p)
   check(f'Touch-down does not snap the pose (request {dx}px)',project(p)['pose']==before)
   client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx,'y':y,'id':1}]});client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});wait(p)
   after=handle(p,'hand-L');m=metrics(p);move=after['x']-h['x']
   check(f'Touch request {dx}px retains direction, stable ID and correct label',move*dx>0 and project(p)['workspace']['selectedBone']=='hand-L' and after['label']=='Screen right · Wrist' and m['shape']['accepted'],{'requestedDx':dx,'actualDx':move})
  p.screenshot(path=str(OUT/'05-touch-screen-labels.png'),full_page=False)
  # Actual browser download, then real file input reimport.
  p.select_option('[data-label-basis]','anatomical');wait(p);saved=project(p)
  with p.expect_download() as dl:p.click('[data-action="export"]')
  download=dl.value;filename=OUT/'label-preference.character.json';download.save_as(filename)
  p.select_option('[data-label-basis]','screen');p.set_input_files('[data-file-project]',str(filename));p.wait_for_function("()=>characterDriver.getProject().workspace.labelBasis==='anatomical'");wait(p)
  check('Project download/reimport restores convention together with exact selection/pose',project(p)==saved and p.input_value('[data-label-basis]')=='anatomical')
  # Toggle labels with the overlay hidden: no artwork effect, no mirror.
  p.evaluate('characterDriver.setOverlay(false)');wait(p);a=pixelhash(p);physical=scene_state(p)
  p.select_option('[data-label-basis]','screen');wait(p)
  check('Changing label mode with overlay hidden does not change a single artwork pixel',pixelhash(p)==a and scene_state(p)==physical)
  check('Invalid label mode rejected without mutation',p.evaluate("()=>{let d=JSON.stringify(characterDriver.getProject());try{characterDriver.setLabelBasis('mirror')}catch{return JSON.stringify(characterDriver.getProject())===d}return false}"))
  check('Mobile page has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('No uncaught browser exceptions',not report['errors'],report['errors'])
  b.close()
except Exception as e:
 report['exception']=str(e);raise
finally:
 report['passed']=sum(c['pass'] for c in report['checks']);report['total']=len(report['checks'])
 (OUT/'labels-browser-results.json').write_text(json.dumps(report,indent=2))
 print('RESULT',report['passed'],'/',report['total'],flush=True)
 if any(not c['pass'] for c in report['checks']):raise SystemExit(1)
