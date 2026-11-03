import {readPublishedPdf,pdfBoxText} from './pdfDocument.js'
const check=(ok,message)=>{if(!ok)throw Object.assign(Error('C-DOT native: '+message),{abortRetries:true})}
const normalize=value=>String(value??'').replace(/\s+/g,' ').trim()
const titleKey=value=>normalize(value).toLowerCase().replace(/professionals?/g,'professional').replace(/[^a-z0-9]/g,'')

export async function readCdotAdvertisement(bytes,listing,{signal}={}){
  const pdf=await readPublishedPdf(bytes,{signal}),first=pdf.pages[0]
  check(first.width===792&&first.height===612&&pdf.totalPages>=3,'native role-table layout changed')
  check(/C-DOT \(Cent(?:er|re) for Development of Telematics\)/.test(pdf.text)&&/Government of India/.test(pdf.text),'native advertisement employer changed')
  const bounds=page=>({bottom:page.number===3?475:75,top:page.number===1?195:530})
  const cell=(left,right)=>pdf.pages.slice(0,3).map(page=>pdfBoxText(page,{left,right,...bounds(page)})).filter(Boolean).join(' ')
  const title=pdfBoxText(first,{left:78,right:178,...bounds(first)}),responsibilities=cell(362,511),criteria=cell(511,674)
  const mode=cell(178,249),ctc=cell(249,305),age=cell(305,362),count=cell(674,717),workplace=cell(717,766)
  check(titleKey(title)===titleKey(listing.title),'listed role and native PDF post identity conflict')
  check(responsibilities.length>500&&/Key Responsibilities/.test(responsibilities)&&/continuous improvement of product architecture/.test(responsibilities),
    'full native responsibility column is unavailable')
  check(criteria.length>500&&/Minimum Percentage 70%/.test(criteria)&&/Desired Skills/.test(criteria),'full native eligibility column is unavailable')
  check(workplace==='Delhi'&&/posted to any Project \/ location throughout the country/.test(normalize(pdf.text)),
    'native role workplace/country cannot be established')
  check(count==='5'&&/^Contractual/.test(mode)&&/35/.test(age),'native role metadata changed')
  const english=[]
  for(const page of pdf.pages){if(/[\u0900-\u097f]/.test(page.text))break;english.push(page)}
  check(english.length>=3&&/English version will prevail/.test(normalize(pdf.text)),'complete primary-language document version unavailable')
  const general=english.filter(page=>page.number>=3).map(page=>page.number===3
    ?page.items.filter(item=>item.y<475).map(item=>item.text+(item.endOfLine?'\n':' ')).join(' '):page.text).join('\n\n')
  const jobDescription=[title,'Mode: '+mode,'CTC: '+ctc,'Maximum age: '+age,responsibilities,criteria,
    'Number of posts: '+count,'Location: '+workplace,general].join('\n\n')
  return {...listing,title,jobDescription,sourceDescription:jobDescription,location:'Delhi, India',city:'Delhi',country:'India',
    employmentType:'Contract',sourceEmploymentType:mode,numberOfOpenings:5,experienceRequired:criteria.match(/Experience\s*-\s*(Fresher to 2 Years)/)?.[1]||null,
    minimumQualification:criteria.match(/Qualification:\s*([\s\S]+?)\s*Desired Skills:/)?.[1]||null,
    sourceDetailComplete:true,sourceNativePDFSHA256:pdf.sha256,sourceNativePDFPages:pdf.totalPages,
    sourceDescriptionPages:english.map(page=>page.number),sourceNativePDFText:pdf.text,
    sourceCountryEvidence:'Native post Location Delhi plus domestic posting clause in the Government of India advertisement'}
}
