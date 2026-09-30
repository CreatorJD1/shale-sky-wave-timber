"""Directional acceptance tests using real Chromium mouse/touch/keyboard input.
No painted UI; coordinates are independently projected from the stored world joints.
"""
from pathlib import Path
import os,json,math,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
HTML=ROOT/'Shadowveil_Character_Driver_Foundation.html'
OUT=ROOT/'verification-direction';OUT.mkdir(exist_ok=True)
report={'htmlSha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'checks':[],'errors':[],
 'environment':{'method':'exact HTML bytes via Playwright set_content','realMouseEvents':True,'emulatedMobileTouch':True,'physicalAndroid':False,'fullViteBuild':False,'originPersistenceReload':False},'drags':[]}
def check(name,ok,detail=None):
 entry={'name':name,'pass':bool(ok)}
 if detail is not None:entry['detail']=detail
 report['checks'].append(entry);print(('PASS' if ok else 'FAIL'),name,flush=True)
def wait(p):p.wait_for_timeout(120)
def metrics(p):return p.evaluate('characterDriver.metrics()')
def project(p):return p.evaluate('characterDriver.getProject()')
def point(p,id):
 m=metrics(p);r=p.locator('canvas').bounding_box();v=m['world'][id]['position'];cam=m['camera']
 yaw=-cam['yaw']*math.pi/180;pitch=cam['pitch']*math.pi/180
 xx=math.cos(yaw)*v['x']+math.sin(yaw)*v['z'];zz=-math.sin(yaw)*v['x']+math.cos(yaw)*v['z'];yy=math.cos(pitch)*v['y']-math.sin(pitch)*zz
 scale=min(r['width']/690,max(120,r['height']-40)/1100)*.97*cam['zoom']
 ox=r['width']/2-256*scale;oy=(r['height']-40-1100*scale)/2+4
 return {'x':r['x']+(xx+258.8)*scale+ox,'y':r['y']+(527-yy)*scale+oy}
def screenshot(p,name):p.screenshot(path=str(OUT/name),full_page=False)
def pose_seed(n):
 p=json.loads(json.dumps(n))
 for name,angle in [('upper-R',-15),('upper-L',15),('forearm-R',-25),('forearm-L',25),('thigh-R',-5),('thigh-L',5),('shin-R',10),('shin-L',-10)]:
  p['rotations'][name]={'x':0,'y':0,'z':math.sin(angle*math.pi/360),'w':math.cos(angle*math.pi/360)}
 return p
PROJECTIONS=[{'yaw':0,'pitch':0,'zoom':1},{'yaw':8,'pitch':5,'zoom':.8},{'yaw':90,'pitch':20,'zoom':1},{'yaw':180,'pitch':15,'zoom':1},{'yaw':-90,'pitch':-15,'zoom':1.15}]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  ctx=browser.new_context(viewport={'width':1360,'height':1050},device_scale_factor=1.5,accept_downloads=True)
  page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.set_content(HTML.read_text(),wait_until='load');page.wait_for_function('window.driverReady===true');wait(page)
  neutral=project(page)['pose'];seed=pose_seed(neutral)
  check('Delivered revision identifies screen-label fix 0.1.2',metrics(page)['version']=='foundation-0.1.2' and 'SCREEN LABELS' in page.locator('.cd-kicker').first.inner_text())
  page.evaluate('characterDriver.setOverlay(true)');wait(page)
  def setup(bone,cam,pose=seed):
   page.evaluate('(a)=>{characterDriver.setPose(a.pose);characterDriver.setCamera(a.cam);}',{'pose':pose,'cam':cam});wait(page)
   page.select_option('[data-bone]',bone);page.locator('canvas').scroll_into_view_if_needed();wait(page)
  # Test all directions on both wrists in front, plus depth/camera variations.
  for cam in PROJECTIONS:
   for bone in ['hand-R','hand-L']:
    for dx,dy in ([[-5,0],[5,0],[0,-5],[0,5]] if cam['yaw']==0 else [[-5,0],[5,0]]):
     setup(bone,cam);before=point(page,bone);before_pose=project(page)['pose']
     page.mouse.move(before['x']+2,before['y']-1);page.mouse.down();wait(page)
     if cam['yaw']==0 and dx==-5:check('No snap on offset grab · '+bone,project(page)['pose']==before_pose)
     page.mouse.move(before['x']+2+dx,before['y']-1+dy,steps=2);page.mouse.up();wait(page)
     after=point(page,bone);move={'dx':after['x']-before['x'],'dy':after['y']-before['y']};m=metrics(page)
     signed=(abs(dx)<.1 or move['dx']*math.copysign(1,dx)>=-.08) and (abs(dy)<.1 or move['dy']*math.copysign(1,dy)>=-.08)
     progress=math.hypot(move['dx'],move['dy'])>.4 or bool(m['lastManipulation'] and m['lastManipulation']['limited'])
     datum={'node':bone,'camera':cam,'request':{'dx':dx,'dy':dy},'movement':move,'tracking':m['lastManipulation']}
     report['drags'].append(datum)
     check(f'Mouse {bone} yaw {cam["yaw"]} request ({dx},{dy}) follows direction or explicitly stops',signed and progress and project(page)['workspace']['selectedBone']==bone and m['shape']['accepted'],datum)
  setup('hand-R',PROJECTIONS[0]);
  # UI left/right buttons are screen-relative even though selected side is anatomical right.
  for action,expected in [('-5,0',-1),('5,0',1)]:
   setup('hand-R',PROJECTIONS[0]);b=point(page,'hand-R');page.click('[data-nudge="'+action+'"]');wait(page);a=point(page,'hand-R')
   check('Explicit '+('Left' if expected<0 else 'Right')+' button moves that screen direction',(a['x']-b['x'])*expected>1)
  setup('hand-L',PROJECTIONS[0]);b=point(page,'hand-L');page.locator('canvas').focus();page.keyboard.press('ArrowLeft');wait(page);a=point(page,'hand-L')
  check('Keyboard ArrowLeft also moves screen-left',a['x']<b['x']-1)
  # Root inverse with combined yaw/pitch is a distinct regression.
  setup('pelvis',{'yaw':45,'pitch':30,'zoom':1},neutral);b=point(page,'pelvis');page.mouse.move(b['x'],b['y']);page.mouse.down();page.mouse.move(b['x']+10,b['y']-8,steps=2);page.mouse.up();wait(page);a=point(page,'pelvis')
  check('Root follows diagonal screen drag at combined yaw/pitch',abs(a['x']-b['x']-10)<.15 and abs(a['y']-b['y']+8)<.15)
  screenshot(page,'03-root-angled-direction.png')
  # Returning pointer to the origin must actually undo the current drag, not early-return.
  setup('hand-R',PROJECTIONS[0]);before_pose=project(page)['pose'];b=point(page,'hand-R');page.mouse.move(b['x'],b['y']);page.mouse.down();page.mouse.move(b['x']-5,b['y']);wait(page);page.mouse.move(b['x'],b['y']);page.mouse.up();wait(page)
  check('Dragging back to the grab origin restores original pose',project(page)['pose']==before_pose)
  setup('hand-R',PROJECTIONS[0]);before_pose=project(page)['pose'];b=point(page,'hand-R');page.mouse.move(b['x'],b['y']);page.mouse.down();page.mouse.move(b['x']-5,b['y']);wait(page);page.keyboard.press('Escape');page.mouse.up();wait(page)
  check('Escape cancels a live drag without leaving a pose offset',project(page)['pose']==before_pose)
  # Real ring drag rotates the selected forearm around the elbow, rather than translating it.
  setup('forearm-R',PROJECTIONS[0]);b=point(page,'forearm-R');w=point(page,'hand-R');start=75;end=82
  page.mouse.move(b['x']+34*math.cos(start*math.pi/180),b['y']+34*math.sin(start*math.pi/180));page.mouse.down()
  page.mouse.move(b['x']+34*math.cos(end*math.pi/180),b['y']+34*math.sin(end*math.pi/180),steps=3);page.mouse.up();wait(page);a=point(page,'forearm-R');nw=point(page,'hand-R')
  da=(math.atan2(nw['y']-a['y'],nw['x']-a['x'])-math.atan2(w['y']-b['y'],w['x']-b['x']))*180/math.pi
  check('Clockwise ring drag rotates clockwise and preserves its pivot',math.hypot(a['x']-b['x'],a['y']-b['y'])<.1 and da>.05,{'actualDegrees':da})
  # A retained selection disambiguates same-position shoulder/clavicle nodes.
  setup('upper-R',PROJECTIONS[0]);b=point(page,'upper-R');page.mouse.click(b['x'],b['y']);wait(page)
  check('Shoulder selection is not silently redirected to its coincident clavicle',project(page)['workspace']['selectedBone']=='upper-R')
  setup('clavicle-R',PROJECTIONS[0]);b=point(page,'clavicle-R');page.mouse.click(b['x'],b['y']);wait(page)
  check('Explicit clavicle selection remains available',project(page)['workspace']['selectedBone']=='clavicle-R')
  setup('hand-R',PROJECTIONS[0]);front_hint=page.locator('[data-bone-hint]').inner_text();page.evaluate('characterDriver.setCamera({yaw:180})');wait(page);back_hint=page.locator('[data-bone-hint]').inner_text()
  check('Label keeps anatomical right while the screen-side label changes',('Character right' in front_hint and 'screen-left' in front_hint and 'Character right' in back_hint and 'screen-right' in back_hint))
  setup('hand-R',PROJECTIONS[0]);b=point(page,'hand-R');page.mouse.move(b['x'],b['y']);page.mouse.down();page.mouse.move(b['x']-8,b['y']-2,steps=3);page.mouse.up();wait(page)
  screenshot(page,'01-screen-left-wrist-drag.png')
  page.evaluate('characterDriver.setOverlay(false)');wait(page);screenshot(page,'02-art-after-drag.png')
  snap=project(page)
  with page.expect_download() as d:page.click('[data-action="export"]')
  path=OUT/'direction-project.character.json';d.value.save_as(path);raw=path.read_text()
  page.evaluate('(p)=>characterDriver.setPose(p)',neutral);page.evaluate('(t)=>characterDriver.importProject(t)',raw);wait(page)
  check('Project export/reimport preserves anatomical IDs, pose, camera and selection',project(page)==snap)
  # Mobile touch uses independent CSS coordinates at non-unit DPR and zoom.
  mobile=browser.new_context(viewport={'width':430,'height':950},device_scale_factor=2,is_mobile=True,has_touch=True)
  mp=mobile.new_page();mp.on('pageerror',lambda e:report['errors'].append('mobile '+str(e)));mp.set_content(HTML.read_text(),wait_until='load');mp.wait_for_function('window.driverReady===true');wait(mp)
  mp.evaluate('characterDriver.setOverlay(true)');wait(mp);cdp=mobile.new_cdp_session(mp)
  for bone,dx,dy in [('hand-R',-6,0),('hand-R',6,0),('hand-L',-6,0),('hand-L',6,0),('hand-R',0,-4),('hand-L',0,4)]:
   mp.evaluate('(p)=>{characterDriver.setPose(p);characterDriver.setCamera({yaw:6,pitch:4,zoom:.85});}',seed);mp.select_option('[data-bone]',bone);mp.locator('canvas').scroll_into_view_if_needed();wait(mp)
   b=point(mp,bone);base=project(mp)['pose'];cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+1,'y':b['y']+1}]});wait(mp)
   if dx==-6:check('Mobile touch grab is stable · '+bone,project(mp)['pose']==base)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':b['x']+1+dx,'y':b['y']+1+dy}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});wait(mp)
   a=point(mp,bone);mx=a['x']-b['x'];my=a['y']-b['y'];m=metrics(mp)
   signed=(not dx or mx*math.copysign(1,dx)>=-.08)and(not dy or my*math.copysign(1,dy)>=-.08)
   check(f'Real mobile touch {bone} ({dx},{dy}) has correct screen signs',signed and math.hypot(mx,my)>.1 and project(mp)['workspace']['selectedBone']==bone,{'dx':mx,'dy':my,'tracking':m['lastManipulation']})
  # Cancelled touch restores pose.
  mp.evaluate('(p)=>characterDriver.setPose(p)',seed);wait(mp);bone='hand-L';mp.select_option('[data-bone]',bone);b=point(mp,bone);base=project(mp)['pose']
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[b]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':b['x']-5,'y':b['y']}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});wait(mp)
  check('Touch cancel restores the pre-grab pose',project(mp)['pose']==base)
  # Final mobile proof: left hand (on screen-right), moved LEFT.
  b=point(mp,'hand-L');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[b]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':b['x']-7,'y':b['y']-1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});wait(mp)
  screenshot(mp,'04-mobile-left-hand-screen-left.png')
  check('Mobile has no horizontal layout overflow',mp.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('No uncaught runtime exceptions',not report['errors'],report['errors'])
  browser.close()
except Exception as e:
 report['exception']=str(e);raise
finally:
 report['passed']=sum(x['pass'] for x in report['checks']);report['total']=len(report['checks']);(OUT/'direction-browser-results.json').write_text(json.dumps(report,indent=2));print('RESULT',report['passed'],'/',report['total'],flush=True)
 if any(not c['pass'] for c in report['checks']):raise SystemExit(1)
