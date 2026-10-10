import {readFile, writeFile, mkdir, cp, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const read = (p) => readFile(path.join(root, p), 'utf8');
const json = async (name) => JSON.parse(await read(`src/content/${name}.json`));
const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const templates = {};
const template = async (name, values = {}) => {
  templates[name] ??= await read(`src/templates/${name}.html`);
  return templates[name].replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
};
const [profile, cards, details, publications, news] = await Promise.all(
  ['profile','projects','project-details','publications','news'].map(json)
);

await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
await cp(path.join(root, 'public'), output, {recursive:true, filter:source=>path.basename(source)!=='.DS_Store'});
await mkdir(path.join(output,'assets'), {recursive:true});
await cp(path.join(root,'src/styles'), path.join(output,'assets/styles'), {recursive:true});
await cp(path.join(root,'src/scripts'), path.join(output,'assets/scripts'), {recursive:true});

const paragraphs = (html) => html.split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join('\n');
const sidebar = async (prefix, withInterests = false) => template('components/sidebar', {
  INTERESTS: withInterests ? `<div class="research-interests"><p>${escape(profile.interests[0])}</p><ul>${profile.interests.slice(1).map(x=>`<li>${escape(x)}</li>`).join('')}</ul></div>` : '',
  CONTACTS: profile.contacts.map(c=>`<a href="${escape(c.url)}"${c.url.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}>${escape(c.label)} <span aria-hidden="true">↗</span></a>`).join('\n')
});

function imageStyle(image, crop = false) {
  let style = `--image-opacity:${image.opacity};`;
  const filters = image.filters ?? {};
  // Figma's filters are renderer-specific; map exposure/contrast/saturation conservatively.
  const effects = [];
  if (filters.exposure) effects.push(`brightness(${Math.pow(2,filters.exposure).toFixed(3)})`);
  if (filters.contrast) effects.push(`contrast(${(1+filters.contrast).toFixed(3)})`);
  if (filters.vibrance) effects.push(`saturate(${(1+filters.vibrance).toFixed(3)})`);
  if (effects.length) style += `--image-filter:${effects.join(' ')};`;
  if (crop && image.transform) {
    const t=image.transform;
    if (t.m00 && t.m11) style += `--crop-width:${100/t.m00}%;--crop-height:${100/t.m11}%;--crop-left:${-100*t.m02/t.m00}%;--crop-top:${-100*t.m12/t.m11}%;`;
  }
  return style;
}

const homeProjects = cards.map(card=>{
  const img = `<div class="project-image" style="${imageStyle(card.image)}"><img src="${escape(card.image.src)}" width="${card.image.width}" height="${card.image.height}" alt="${escape(card.title)}" loading="lazy" decoding="async"></div>`;
  const copy = `<div class="project-label"><h3>${escape(card.title)}</h3><p>${escape(card.year)}</p></div>`;
  const attrs = `data-figma-node="${card.nodeId}"`;
  if (card.link.route) return `<a class="project-card" href="${escape(card.link.route)}/" ${attrs}>${img}${copy}</a>`;
  if (card.link.external) return `<a class="project-card" href="${escape(card.link.external)}" target="_blank" rel="noopener noreferrer" ${attrs}>${img}${copy}</a>`;
  // A card without a destination stays static until its detail page is supplied.
  return `<article class="project-card" ${attrs}>${img}${copy}</article>`;
}).join('\n');

const home = await template('pages/home', {
  NAME:escape(profile.name), BIO:paragraphs(profile.bioHtml),
  HERO:`<div class="hero-image" style="${imageStyle(profile.hero,true)}" data-figma-node="${profile.hero.nodeId}"><img src="${profile.hero.src}" alt="A panoramic cityscape from the original website design" width="${profile.hero.width}" height="${profile.hero.height}" fetchpriority="high" decoding="async"></div>`,
  AVATAR:`<div class="avatar-wrap"><img class="avatar" src="${profile.avatar.src}" width="174" height="174" style="opacity:${profile.avatar.opacity}" alt="Portrait of Muyi Zhu" decoding="async"></div>`,
  SIDEBAR:await sidebar('',true), PROJECTS:homeProjects
});

async function emit(route, content, title, description, bodyClass = '', filename = '') {
  const prefix = route ? '../' : '';
  const nav = await template('components/nav', {
    ROOT:prefix, HOME_ACTIVE:route===''?'active':'', PUB_ACTIVE:route==='publication'?'active':'', NEWS_ACTIVE:route==='news'?'active':'',
    HOME_CURRENT:route===''?'aria-current="page"':'', PUB_CURRENT:route==='publication'?'aria-current="page"':'', NEWS_CURRENT:route==='news'?'aria-current="page"':''
  });
  let html = await template('layouts/base', {
    ROOT:prefix, TITLE:escape(title), DESCRIPTION:escape(description), BODY_CLASS:bodyClass,
    SHELL_CLASS:route?'inner-shell':'home-shell', NAV:nav, CONTENT:content,
    FOOTER:await template('components/footer'), LIGHTBOX:await template('components/lightbox')
  });
  if (filename === '404.html') {
    const siteBase=process.env.SITE_BASE_PATH || '/';
    html=html.replace('<head>',`<head>\n  <base href="${escape(siteBase.endsWith('/')?siteBase:siteBase+'/')}">`);
  }
  const destination = filename ? path.join(output,filename) : route ? path.join(output,route,'index.html') : path.join(output,'index.html');
  await mkdir(path.dirname(destination), {recursive:true});
  await writeFile(destination,html.replace(/[ \t]+$/gm,''));
}

await emit('',home,'Muyi Zhu — Urban research & design', 'Muyi Zhu researches road safety, environmental exposure and active urban mobility, using geospatial modelling, machine learning and causal inference.','home-page');
await emit('publication',await template('pages/list',{
  ROOT:'../', HEADING:'Peer-reviewed Journal Articles', SIDEBAR:await sidebar('../'),
  LIST:`<ol class="publication-list">${publications.map((p,i)=>`<li data-publication="${i+1}">${p.html}</li>`).join('\n')}</ol>`
}),'Publications — Muyi Zhu','Peer-reviewed journal articles by Muyi Zhu on pedestrian safety, urban visual inequality, charging infrastructure and mobility.','list-page');
await emit('news',await template('pages/list',{
  ROOT:'../', HEADING:'News', SIDEBAR:await sidebar('../'),
  LIST:`<ol class="news-list">${news.map(n=>`<li><time datetime="${escape(n.date)}">[${escape(n.date)}]</time><div>${paragraphs(n.html)}</div></li>`).join('\n')}</ol>`
}),'News — Muyi Zhu','Research publications, conference presentations and project updates from Muyi Zhu.','list-page');

for (const detail of details) {
  let figureNumber=0;
  const blocks=detail.blocks.map(b=>{
    if (b.type==='text') return `<div class="project-prose" data-figma-node="${b.nodeId}">${paragraphs(b.html)}</div>`;
    figureNumber++;
    const caption=`${detail.title} — project board ${figureNumber}`;
    return `<figure class="project-figure" data-figma-node="${b.nodeId}"><button type="button" class="figure-open" data-image="../${escape(b.image.full)}" data-caption="${escape(caption)}" aria-label="Enlarge ${escape(caption)}"><img src="../${escape(b.image.src)}" width="${b.image.width}" height="${b.image.height}" alt="${escape(caption)}" loading="lazy" decoding="async"><span class="figure-enlarge" aria-hidden="true">↗</span></button></figure>`;
  }).join('\n');
  await emit(detail.route,await template('pages/project',{
    ROOT:'../', HEADING:escape(detail.title), SUBTITLE:escape(detail.subtitle), SIDEBAR:await sidebar('../'), BLOCKS:blocks
  }),`${detail.title} — Muyi Zhu`,detail.subtitle,'project-page');
}

const notFound=await template('pages/list',{
  ROOT:'', HEADING:'Page not found', SIDEBAR:await sidebar(''),
  LIST:'<div class="project-prose"><p>The page may have moved. Explore the projects from the homepage.</p></div>'
});
await emit('',notFound,'Page not found — Muyi Zhu','Return to Muyi Zhu’s personal website.','error-page','404.html');
await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built ${details.length+3} pages + 404 in ${output}`);
