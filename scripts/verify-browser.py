"""Browser QA for the generated static site. Requires installed Playwright/Chromium.

Start npm run preview first, then run python3 scripts/verify-browser.py.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import os

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/previews'
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('SITE_PREVIEW_URL', 'http://127.0.0.1:4173').rstrip('/')
routes = ['/', '/publication/', '/news/'] + ['/' + p['route'] + '/' for p in json.loads((ROOT / 'src/content/project-details.json').read_text())]
results, errors = [], []
formatting = {}

def wait_images(page):
    for img in page.locator('main img').all():
        img.scroll_into_view_if_needed()
        img.evaluate('''img => img.complete ? Promise.resolve() : new Promise((resolve,reject)=>{
          img.addEventListener('load',resolve,{once:true});
          img.addEventListener('error',()=>reject(new Error(img.src)),{once:true});
        })''')
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    page.evaluate('Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: errors.append(f'{r.status}: {r.url}') if r.status >= 400 and r.url != BASE+'/missing-page/' else None)
    for width in (320,390,768,1024,1280,1440,1920):
        home_nav = None
        page.set_viewport_size({'width':width,'height':900})
        for route in routes:
            response=page.goto(BASE+route,wait_until='load')
            page.evaluate('document.fonts.ready')
            measurements=page.evaluate('''() => ({
              documentWidth:document.documentElement.scrollWidth,
              viewport:innerWidth,
              mainHeadings:document.querySelectorAll('main h1').length,
              overflow:document.documentElement.scrollWidth > innerWidth,
              nav:!!document.querySelector('nav'),
              emptyLinks:[...document.querySelectorAll('main a, nav a, footer a')].filter(a=>!a.getAttribute('href')).length,
              navGeometry:[...document.querySelectorAll('nav a')].map(a=>({x:a.getBoundingClientRect().x,y:a.getBoundingClientRect().y,width:a.getBoundingClientRect().width}))
            })''')
            if home_nav is None:
                home_nav=measurements['navGeometry']
            measurements['navigationAligned']=all(abs(a[k]-b[k]) < .5 for a,b in zip(home_nav,measurements['navGeometry']) for k in ('x','y','width'))
            page.evaluate("window.scrollTo({top:300,behavior:'instant'})")
            measurements['stickyHeader']=page.locator('.site-header').evaluate("e=>Math.abs(e.getBoundingClientRect().top)<.5")
            results.append({'width':width,'route':route,'status':response.status,**measurements})

    # Capture actual loaded images; avoid capturing a transient animation frame.
    page.emulate_media(reduced_motion='reduce')
    for name, route, width, height in [
        ('home-desktop','/',1440,1000),('home-mobile','/',390,844),
        ('project-desktop','/project-nighttime-pedestrian-safety/',1440,1000),
        ('project-mobile','/project-eco-waterfront/',390,844),
        ('publication-desktop','/publication/',1440,1000),
        ('news-mobile','/news/',390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(BASE+route,wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        wait_images(page)
        page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
        if name=='home-desktop':
            page.screenshot(path=str(OUT/'home-desktop-firstfold.png'))
        broken=page.locator('main img').evaluate_all('(imgs)=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)')
        if broken:errors.extend(broken)

    page.goto(BASE+'/project-eco-waterfront/',wait_until='networkidle')
    trigger=page.locator('.figure-open').first
    trigger.click()
    page.wait_for_function("document.querySelector('.image-stage img').naturalWidth > 0")
    lightbox={'opens':page.locator('dialog').evaluate('(d)=>d.open')}
    lightbox['onlyRequestedControls']=page.locator('.image-tools').inner_text().splitlines()==['Open image ↗','Close ×']
    lightbox['noVisibleCaption']=page.locator('.image-caption').count()==0
    lightbox['roundedCorners']=page.locator('dialog').evaluate('e=>parseFloat(getComputedStyle(e).borderTopLeftRadius)>=12')
    page.screenshot(path=str(OUT/'image-viewer-mobile.png'))
    page.keyboard.press('Escape')
    lightbox['escCloses']=not page.locator('dialog').evaluate('(d)=>d.open')
    lightbox['focusRestored']=trigger.evaluate('(e)=>document.activeElement===e')

    page.set_viewport_size({'width':1440,'height':1000})
    page.goto(BASE+'/',wait_until='networkidle')
    formatting['bioRegularWithLinkedEmphasis']=page.locator('.bio').evaluate("e=>getComputedStyle(e).fontWeight==='400'&&[...e.querySelectorAll('strong')].every(s=>!!s.closest('a'))")
    formatting['bioParagraphSpacing']=page.locator('.bio p').nth(1).evaluate('e=>parseFloat(getComputedStyle(e).marginTop)>0')
    formatting['interestBullets']=page.locator('.research-interests ul').evaluate("e=>getComputedStyle(e).listStyleType==='disc'")
    formatting['rulesAboveSections']=all(page.locator(s).evaluate('e=>parseFloat(getComputedStyle(e).borderTopWidth)>0') for s in ('.research-interests','.section-heading','.contact-links a:first-child'))
    formatting['commuteStatic']=page.locator('.project-card').filter(has_text='Commute Exposure').evaluate("e=>e.tagName==='ARTICLE'&&!e.hasAttribute('data-image')&&!e.querySelector('a,button')")
    wait_images(page)
    page.evaluate("window.scrollTo({top:900,behavior:'instant'})")
    page.screenshot(path=str(OUT/'home-scrolled-desktop.png'))
    contacts=page.locator('.contact-links a').evaluate_all('(a)=>a.map(x=>({text:x.textContent,url:x.href}))')
    formatting['sharedContacts']=True
    formatting['headingsCentered']=True
    for route in routes[1:]:
        page.goto(BASE+route,wait_until='load')
        formatting['sharedContacts'] &= contacts == page.locator('.contact-links a').evaluate_all('(a)=>a.map(x=>({text:x.textContent,url:x.href}))')
        formatting['headingsCentered'] &= page.locator('.page-heading').evaluate("e=>getComputedStyle(e).textAlign==='center'")
    for route in ('project-optimization-of-charging-stations','project-ride-hailing-gender-gaps'):
        page.goto(BASE+'/'+route+'/',wait_until='load')
        formatting[route+'SinglePaperLink']=page.locator('.project-prose a').count()==1 and page.locator('.project-prose a').inner_text()=='paper'
    page.goto(BASE+'/publication/',wait_until='load')
    formatting['publicationNumbering']=page.locator('.publication-list').evaluate("e=>getComputedStyle(e).listStyleType==='decimal'")
    formatting['authorUnderlineOnly']=page.locator('.publication-list li').first.locator('.source-underline').all_inner_texts()==['Zhu, Muyi']
    page.goto(BASE+'/news/',wait_until='load')
    formatting['boldNewsDates']=page.locator('time').evaluate_all('(a)=>a.every(e=>Number(getComputedStyle(e).fontWeight)>=600)')

    page.set_viewport_size({'width':390,'height':844})
    page.goto(BASE+'/',wait_until='networkidle')
    page.get_by_role('link',name='Publication',exact=True).click()
    nav=page.url.endswith('/publication/')
    page.get_by_role('link',name='Homepage',exact=True).click()
    page.locator('a.project-card').first.click()
    project_link=page.url.endswith('/project-nighttime-pedestrian-safety/')
    page.get_by_role('link',name='Back to projects').click()
    back=page.url.endswith('/index.html#projects')
    page.emulate_media(reduced_motion='reduce')
    page.reload(wait_until='networkidle')
    reduced=page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'")

    # The HTML content and ordinary page links remain usable without JavaScript.
    no_js=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
    plain=no_js.new_page();plain.goto(BASE+'/',wait_until='networkidle')
    without_js=plain.locator('h1').inner_text()=='Muyi Zhu' and plain.locator('a.project-card').count()==10
    no_js.close()
    response=page.goto(BASE+'/missing-page/',wait_until='networkidle')
    not_found=response.status==404 and page.locator('h1').inner_text()=='Page not found'
    browser.close()

failures=[r for r in results if r['overflow'] or r['status']!=200 or r['mainHeadings']!=1 or r['emptyLinks'] or not r['navigationAligned'] or not r['stickyHeader']]
summary={'layoutChecks':len(results),'pages':len(routes),'widths':[320,390,768,1024,1280,1440,1920],
         'layoutFailures':failures,'runtimeOrAssetErrors':sorted(set(errors)),
         'lightbox':lightbox,'formatting':formatting,'navigation':{'publication':nav,'projectCard':project_link,'backToProjects':back},
         'reducedMotion':reduced,'contentWithoutJavaScript':without_js,'notFound':not_found}
(OUT/'verification.json').write_text(json.dumps({'summary':summary,'layouts':results},indent=2))
print(json.dumps(summary,indent=2))
if failures or errors or not all(lightbox.values()) or not all(formatting.values()) or not all((nav,project_link,back,reduced,without_js,not_found)):
    raise SystemExit(1)
