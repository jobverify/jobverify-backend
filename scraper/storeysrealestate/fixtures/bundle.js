const routes=[{path:"/"},{path:"/careers"}];
const applyEndpoint="https://api.storeys.ae/api/v1/careers";
const fields=["firstName","lastName","email","phone","designation","resume"];
export function openApplyModal(){
  return { endpoint: applyEndpoint, fields, label: "APPLY NOW" };
}
