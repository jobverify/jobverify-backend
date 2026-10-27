import { frozenResponses } from './options.js'
import { SOURCES,CAREER_PAGE_ID,DASHBOARD_URL,ZERO_GUID,nativeSurfaceContract } from '../nativeContract.js'

// Explicitly synthetic nonempty rows exercise contracts; the frozen current
// public board has Total 0. No synthetic row is represented as a live vacancy.
export function syntheticRole(source='ola') {
  const cfg=SOURCES[source],id=source==='ola'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222'
  const description='<p>Build and maintain reliable distributed services for our mobility platforms. Work with product and engineering colleagues to design robust APIs, investigate production issues, improve availability and deliver maintainable software with clear documentation.</p>'
  const row={JobId:id,JobIdObfuscated:id,JobCode:'SYNTHETIC-100',JobTitle:'Synthetic Software Engineer',Department:'Engineering',Location:'[{"Address":"Bengaluru, Karnataka, India","PlaceId":"synthetic-place"}]',PublishedDate:'2026-10-20T10:00:00Z',ExpiryDates:{CAREERPAGE:'2026-11-20T00:00:00'},Skills:['JavaScript','Distributed services'],Experience:{MinExp:3,MaxExp:6},JobDescV2:description,OrgDetails:{OrgID:CAREER_PAGE_ID}}
  const dto={...structuredClone(row),RequisitionId:ZERO_GUID,PublishedDates:{CAREERPAGE:row.PublishedDate},PublishedDate:'2026-09-01T10:00:00Z',PublishedJobBoards:['CAREERPAGE'],JobStatus:'Active',IsPublic:true,IsDraft:false,JobDescriptionV2:description,RolesAndResponsibilitiesV2:'',EligibilityV2:'',AdditionalFields:[],ApplicationEnquiryTemplateId:'33333333-3333-4333-8333-333333333333',OrgDetails:{OrgID:CAREER_PAGE_ID,OrgName:'ANI Technologies Pvt Ltd',OrgURL:'https://www.olaelectric.com/',CareerPageSubdomain:'olacareers',IsCareerPagePublished:true}}
  const posting={'@context':'https://schema.org','@type':'JobPosting',title:row.JobTitle,description,datePosted:'2026-10-20',validThrough:'2026-11-20',hiringOrganization:{'@type':'Organization',name:cfg.legalEmployer,sameAs:cfg.employerURL},jobLocation:{'@type':'Place',address:{'@type':'PostalAddress',addressLocality:'Bengaluru, Karnataka, India',addressCountry:'India'}}}
  const render=()=>frozenResponses()[DASHBOARD_URL].body.replace('$GOOGLE_LD',JSON.stringify(posting))
  return {row,dto,posting,render,page:()=>nativeSurfaceContract(render(),'',{role:true})}
}
