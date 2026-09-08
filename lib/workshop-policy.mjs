import data from './workshop-policy-data.json' with {type:'json'};
export const WORKSHOP_POLICY=data.current;
export const workshopType=(id,version=WORKSHOP_POLICY)=>data.versions[version]?.groups[Math.floor(Number(id)/1000)]??null;
export const validWorkshopPolicyJob=j=>Number.isInteger(j.policyVersion??1)&&workshopType(j.product,j.policyVersion??1)!==null&&(j.assignedType===undefined||j.assignedType===workshopType(j.product,j.policyVersion??1));
