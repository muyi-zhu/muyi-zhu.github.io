import {readFile, readdir, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);files.push(...(e.isDirectory()?await walk(p):[p]));}return files;}
const outputFiles=await walk(root);
const htmlFiles=outputFiles.filter(p=>p.endsWith('.html'));
const failures=[];let references=0;
// Deploy only the generated website, never source, tooling or package metadata.
const forbidden=new Set(['src','public','scripts','docs','node_modules','.git','.github','package.json','package-lock.json','README.md','.DS_Store']);
for(const file of outputFiles){
  const parts=path.relative(root,file).split(path.sep);
  if(forbidden.has(parts[0])||parts.includes('.DS_Store'))failures.push(`${file}: development file in publish output`);
}
// Rich-text paragraphs must be independently balanced. Imported Figma styles
// used to cross newlines, producing orphan tags and duplicated browser links.
let paragraphs=0;
function validateContent(value,label){
  if(Array.isArray(value)){value.forEach((v,i)=>validateContent(v,`${label}[${i}]`));return;}
  if(!value||typeof value!=='object')return;
  for(const [key,entry] of Object.entries(value)){
    if((key==='html'||key==='bioHtml')&&typeof entry==='string'){
      for(const [lineIndex,line] of entry.split('\n').entries()){
        if(!line.trim())continue;
        paragraphs++;
        const stack=[];
        for(const match of line.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)){
          const tag=match[1].toLowerCase();
          if(['br','img','hr','wbr'].includes(tag)||match[0].endsWith('/>'))continue;
          if(match[0].startsWith('</')){
            if(stack.pop()!==tag)failures.push(`${label}.${key}:${lineIndex+1}: mismatched ${tag} tag`);
          }else stack.push(tag);
        }
        if(stack.length)failures.push(`${label}.${key}:${lineIndex+1}: unclosed ${stack.join(', ')} tag`);
      }
    }else validateContent(entry,`${label}.${key}`);
  }
}
const contentRoot=path.join(root,'../src/content');
for(const file of await readdir(contentRoot)){
  if(file.endsWith('.json'))validateContent(JSON.parse(await readFile(path.join(contentRoot,file),'utf8')),file);
}
for(const file of htmlFiles){
  const html=await readFile(file,'utf8');
  if(html.includes('{{'))failures.push(`${file}: unresolved template`);
  if(!/<h1[ >]/.test(html))failures.push(`${file}: missing h1`);
  for(const match of html.matchAll(/(?:src|href|data-image)="([^"]+)"/g)){
    const value=match[1];
    if(/^(?:https?:|mailto:|tel:|data:|#)/.test(value))continue;
    references++;
    const [pathname]=value.split('#');
    let target=pathname.startsWith('/')?path.join(root,pathname):path.resolve(path.dirname(file),pathname);
    try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');if(!(await stat(target)).size)failures.push(`${file}: empty ${value}`);}catch{failures.push(`${file}: missing ${value}`);}
  }
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`Checked ${htmlFiles.length} HTML documents, ${references} local references and ${paragraphs} rich-text paragraphs: passed.`);
