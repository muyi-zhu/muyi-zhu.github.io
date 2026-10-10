"""Import authored content and image fills from the locally decoded Figma Sites file.

Run explicitly when importing a new design; normal builds never overwrite content.
Requires Pillow. The original .site file stays outside the publishable directory.
"""
from pathlib import Path
from html import escape
import json
import re
import zipfile
import io
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent
nodes = json.loads((SOURCE / 'design-inspection/design-nodes.json').read_text())['nodes']
node_id = lambda n: f"{n['guid']['sessionID']}:{n['guid']['localID']}"
by_id = {node_id(n): n for n in nodes}
children = {}
for n in nodes:
    p = n.get('parentIndex', {}).get('guid')
    if p:
        children.setdefault(f"{p['sessionID']}:{p['localID']}", []).append(n)
for value in children.values():
    value.sort(key=lambda n: n['parentIndex']['position'])

def descendants(n):
    result = []
    for c in children.get(node_id(n), []):
        result.append(c)
        result.extend(descendants(c))
    return result

def normalize_url(url):
    # The source uses https://10.1016/... for DOI links. Normalize the resolver.
    if re.match(r'^https?://10\.\d{4,9}/', url):
        return 'https://doi.org/' + url.split('://', 1)[1]
    if 'orcid.org/my-orcid?orcid=' in url:
        return 'https://orcid.org/' + url.split('orcid=', 1)[1]
    return url

def safe_url(url):
    url = normalize_url(url)
    return url if url.startswith(('https://', 'http://', 'mailto:', 'tel:')) else ''

def rich_text(n):
    data = n.get('textData', {})
    text = data.get('characters', '')
    overrides = {s['styleID']: s for s in data.get('styleOverrideTable', [])}
    # Figma characterStyleIDs refer to UTF-16 code units.
    ids = data.get('characterStyleIDs', [])
    groups, pos = [], 0
    for char in text:
        style_id = ids[pos] if pos < len(ids) else 0
        pos += len(char.encode('utf-16-le')) // 2
        if groups and groups[-1][0] == style_id and char != '\n' and not groups[-1][1].endswith('\n'):
            groups[-1][1] += char
        else:
            groups.append([style_id, char])
    result = ''
    for sid, chars in groups:
        if chars == '\n':
            result += '\n'
            continue
        style = overrides.get(sid, {})
        value = escape(chars)
        # A line separator or dangling punctuation is never an interactive link.
        if not chars.strip(' [](){},.;:\t\r'):
            result += value
            continue
        font = style.get('fontName', {}).get('style', '')
        if 'Bold' in font:
            value = '<strong>' + value + '</strong>'
        if 'Italic' in font:
            value = '<em>' + value + '</em>'
        url = safe_url(style.get('hyperlink', {}).get('url', ''))
        if url:
            value = f'<a href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{value}</a>'
        elif style.get('textDecoration') == 'UNDERLINE':
            value = '<span class="source-underline">' + value + '</span>'
        result += value
    return result

pages = [n for n in nodes if n['type'] == 'RESPONSIVE_SET']
route_by_id = {node_id(n): n['name'].strip('/') for n in pages}

def interaction(n):
    for i in n.get('prototypeInteractions', []):
        if i.get('isDeleted'):
            continue
        for a in i.get('actions', []):
            if a.get('connectionType') == 'URL':
                return {'external': safe_url(a.get('connectionURL', ''))}
            g = a.get('transitionNodeID')
            if g:
                route = route_by_id.get(f"{g['sessionID']}:{g['localID']}")
                if route is not None:
                    return {'route': route}
    return {}

archive = zipfile.ZipFile(SOURCE / 'personal_website.site')
asset_cache, manifest = {}, []
(ROOT / 'public/images').mkdir(parents=True, exist_ok=True)

def asset(n, kind='gallery'):
    paint = next((p for p in n.get('fillPaints', []) if p['type'] == 'IMAGE'), None)
    if not paint:
        return None
    h = paint['image']['hash']
    sha = bytes(h[str(i)] for i in range(len(h))).hex()
    if sha not in asset_cache:
        name = re.sub(r'[^a-z0-9]+', '-', paint['image'].get('name', 'image').lower()).strip('-') or 'image'
        name = name[:60] + '-' + sha[:8]
        original = ImageOps.exif_transpose(Image.open(io.BytesIO(archive.read('images/' + sha))))
        if original.mode not in ('RGB', 'RGBA'):
            original = original.convert('RGB')
        # Keep a detailed image for zoom and a smaller display asset.
        full = original.copy()
        full.thumbnail((3600, 3600), Image.Resampling.LANCZOS)
        display = original.copy()
        limit = 1920 if kind == 'hero' else 640 if kind in ('card', 'avatar') else 1800
        display.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        full_path, display_path = f'images/{name}-full.webp', f'images/{name}.webp'
        full.save(ROOT / 'public' / full_path, 'WEBP', quality=94, method=6)
        display.save(ROOT / 'public' / display_path, 'WEBP', quality=90, method=6)
        asset_cache[sha] = {'src': display_path, 'full': full_path,
                            'width': original.width, 'height': original.height}
    out = {**asset_cache[sha], 'nodeId': node_id(n), 'hash': sha,
           'box': n.get('size'), 'radius': n.get('cornerRadius', 0),
           'opacity': paint.get('opacity', 1), 'mode': paint.get('imageScaleMode'),
           'transform': paint.get('transform'), 'filters': paint.get('paintFilter', {})}
    manifest.append(out)
    return out

def block(n):
    if n['type'] == 'TEXT' and n.get('textData', {}).get('characters'):
        return {'type': 'text', 'nodeId': node_id(n),
                'html': rich_text(n), 'font': n.get('fontName'), 'fontSize': n.get('fontSize')}
    image = asset(n)
    if image:
        return {'type': 'image', 'nodeId': node_id(n), 'image': image}
    return None

profile = {'name': by_id['1:126']['textData']['characters'],
           'bioHtml': rich_text(by_id['10:676']),
           'interests': by_id['1:132']['textData']['characters'].splitlines(),
           'hero': asset(by_id['9:617'], 'hero'), 'avatar': asset(by_id['15:1269'], 'avatar'),
           'contacts': []}
for n in children['1:130']:
    if n['type'] != 'INSTANCE':
        continue
    overrides = n.get('symbolData', {}).get('symbolOverrides', [])
    label = next((o['textData']['characters'] for o in overrides if 'textData' in o), '')
    link = next((interaction(o).get('external') for o in overrides if interaction(o).get('external')), '')
    profile['contacts'].append({'label': label, 'url': link})

cards = []
for n in children['15:1327']:
    desc = descendants(n)
    texts = [x['textData']['characters'] for x in desc if x['type'] == 'TEXT']
    image_node = next(x for x in desc if any(p['type'] == 'IMAGE' for p in x.get('fillPaints', [])))
    cards.append({'nodeId': node_id(n), 'title': texts[0], 'year': texts[1],
                  'image': asset(image_node, 'card'), 'link': interaction(n)})

details = []
for p in pages:
    route = p['name'].strip('/')
    if route in ('', 'publication', 'news'):
        continue
    frame = children[node_id(p)][0]
    header = next(n for n in children[node_id(frame)] if n.get('name') == 'Header')
    titles = [x for x in descendants(header) if x['type'] == 'TEXT']
    # Authored content begins in the right-hand Project frame, excluding contacts.
    row = next(n for n in children[node_id(frame)] if n.get('name') == 'Project')
    main = next(n for n in children[node_id(row)] if n.get('name') == 'Project')
    blocks = []
    for n in descendants(main):
        if n.get('textData', {}).get('characters') == 'Back':
            continue
        b = block(n)
        if b:
            blocks.append(b)
    card = next((c for c in cards if c['link'].get('route') == route), {})
    details.append({'route': route, 'nodeId': node_id(p), 'title': titles[0]['textData']['characters'],
                    'subtitle': titles[1]['textData']['characters'] if len(titles) > 1 else '',
                    'year': card.get('year', ''), 'blocks': blocks})

pub_node = by_id['11:713']
# Preserve inline authorship emphasis and paper links, then split the citation list.
pub_html = rich_text(pub_node).split('\n')
publications = [{'html': h} for h in pub_html if h.strip()]
news = []
for n in children['15:1170']:
    if n['type'] != 'TEXT':
        continue
    text = n['textData']['characters']
    date, _, body = text.partition('\n')
    news.append({'date': date.strip('[]'), 'html': rich_text(n).split('\n', 1)[-1]})

content = ROOT / 'src/content'
content.mkdir(parents=True, exist_ok=True)
for name, data in [('profile', profile), ('projects', cards), ('project-details', details),
                   ('publications', publications), ('news', news)]:
    (content / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, indent=2))
(ROOT / 'docs').mkdir(exist_ok=True)
(ROOT / 'docs/asset-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
print(f'Imported {len(cards)} project cards, {len(details)} project pages, {len(publications)} papers, {len(news)} news items and {len(asset_cache)} unique images.')
