async function abortable(start,signal){
 signal.throwIfAborted()
 let listener
 const interrupted=new Promise((_,reject)=>{listener=()=>reject(signal.reason);signal.addEventListener('abort',listener,{once:true})})
 try{
  return await Promise.race([Promise.resolve().then(()=>{signal.throwIfAborted();return start()}),interrupted])
 }catch(error){signal.throwIfAborted();throw error}
 finally{signal.removeEventListener('abort',listener)}
}

export async function withNativeRuntimeControls(profile,defaults,passed,collect){
 const options={...defaults,...passed}
 options.signal?.throwIfAborted()
 options.maxJobs=Object.hasOwn(passed,'maxJobs')&&passed.maxJobs!==undefined?passed.maxJobs:defaults.maxJobs??null
 const maxPages=Object.hasOwn(passed,'maxPages')&&passed.maxPages!==undefined?passed.maxPages:defaults.maxPages
 if(!(options.maxJobs===null||Number.isSafeInteger(options.maxJobs)&&options.maxJobs>=0))throw new RangeError('Declared Greenhouse maxJobs must be a nonnegative safe integer or null')
 if(maxPages!=null&&maxPages!==Infinity)throw new RangeError('Declared Greenhouse finite page limits cannot truncate the native inventory')
 const controller=new AbortController(),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal
 const sourceTimer=setTimeout(()=>controller.abort(Error('Declared Greenhouse source deadline')),900000)
 const bounded=async(start,label)=>{
  signal.throwIfAborted()
  const timer=setTimeout(()=>controller.abort(Error('Declared Greenhouse native '+label+' deadline')),15000)
  try{return await abortable(start,signal)}finally{clearTimeout(timer)}
 }
 try{return await abortable(()=>collect({...options,signal},{read:start=>bounded(start,'read'),audit:start=>bounded(start,'audit')}),signal)}
 finally{clearTimeout(sourceTimer)}
}
