import {createHash} from 'node:crypto'

const check=(ok,message)=>{if(!ok)throw Error('Published PDF: '+message)}
const normalize=value=>String(value??'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim()

export async function readPublishedPdf(value,{signal}={}){
  signal?.throwIfAborted()
  const bytes=Buffer.from(value)
  check(bytes.length>100&&bytes.length<=8*1024*1024&&bytes.subarray(0,5).toString()==='%PDF-','native PDF bytes unavailable or oversized')
  // Use the installed renderer's real platform primitives. Restricted audit
  // processes that forbid native addons must report that environment limit.
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs')
  signal?.throwIfAborted()
  const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useWorkerFetch:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true,verbosity:0})
  const abort=()=>{void task.destroy().catch(()=>{})}
  signal?.addEventListener('abort',abort,{once:true})
  try{
    const pdf=await task.promise
    check(Number.isInteger(pdf.numPages)&&pdf.numPages>=1&&pdf.numPages<=100,'native page count exceeds review bound')
    const pages=[]
    for(let number=1;number<=pdf.numPages;number++){
      signal?.throwIfAborted()
      const page=await pdf.getPage(number),content=await page.getTextContent(),items=content.items.filter(item=>typeof item.str==='string').map(item=>({text:item.str,x:item.transform[4],y:item.transform[5],endOfLine:item.hasEOL===true}))
      const text=normalize(items.map(item=>item.text+(item.endOfLine?'\n':' ')).join(' '))
      check(text.length>30,'a native page has no extractable complete text; OCR requires separate review')
      pages.push({number,width:page.view[2]-page.view[0],height:page.view[3]-page.view[1],text,items})
    }
    signal?.throwIfAborted()
    const text=pages.map(page=>page.text).join('\n\n')
    check(text.length<=500000,'native document text exceeds review bound')
    return {pages,totalPages:pdf.numPages,text,sha256:createHash('sha256').update(bytes).digest('hex')}
  }finally{signal?.removeEventListener('abort',abort);await task.destroy()}
}

export function pdfBoxText(page,{left,right,bottom,top}){
  const items=page.items.filter(item=>item.x>=left&&item.x<right&&item.y>=bottom&&item.y<=top&&item.text.trim()).sort((a,b)=>b.y-a.y||a.x-b.x)
  const lines=[]
  for(const item of items){const last=lines.at(-1);if(!last||Math.abs(last.y-item.y)>2)lines.push({y:item.y,items:[item]});else last.items.push(item)}
  return normalize(lines.map(line=>line.items.sort((a,b)=>a.x-b.x).map(item=>item.text).join(' ')).join(' '))
}
