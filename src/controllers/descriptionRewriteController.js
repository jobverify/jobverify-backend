import AdminAudit from '../models/AdminAudit.js';
import {DescriptionWorkflowError,getDescriptionRewriteWorkflow,setDescriptionRewriteAutomation,dispatchDescriptionRewrite} from '../services/descriptionRewriteWorkflow.js';

const respondWithFailure=(res,error)=>{
 if(error instanceof DescriptionWorkflowError)return res.status(error.status).json({success:false,message:error.message});
 console.error('[descriptionRewrite] Control request failed:',error.message);
 return res.status(500).json({success:false,message:'Description rewriting could not be updated. Try again.'});
};

async function audit(req,action,details){
 try{await AdminAudit.create({admin:req.user._id,action,targetType:'ScraperStatus',targetId:null,details});return true;}
 catch(error){console.warn('[descriptionRewrite] Audit could not be saved:',error.message);return false;}
}

export async function getDescriptionRewriteStatus(_req,res){
 res.set('Cache-Control','no-store');
 try{return res.json({success:true,data:await getDescriptionRewriteWorkflow()});}
 catch(error){return respondWithFailure(res,error);}
}

export async function updateDescriptionRewriteAutomation(req,res){
 if(typeof req.body?.autoRun!=='boolean')return res.status(400).json({success:false,message:'Provide autoRun as a boolean.'});
 try{
  const data=await setDescriptionRewriteAutomation(req.body.autoRun);
  const auditLogged=await audit(req,'updateDescriptionRewriteAutomation',`Description rewriting after successful scrapes ${data.autoRun?'enabled':'disabled'}.`);
  return res.json({success:true,data,auditLogged});
 }catch(error){return respondWithFailure(res,error);}
}

export async function triggerDescriptionRewrite(req,res){
 try{
  const result=await dispatchDescriptionRewrite();
  const auditLogged=await audit(req,'triggerDescriptionRewriteAdmin','Requested the separate description rewriting GitHub workflow.');
  return res.status(202).json({success:true,message:'Description rewriting requested. GitHub will queue the workflow.',...result,auditLogged});
 }catch(error){return respondWithFailure(res,error);}
}
