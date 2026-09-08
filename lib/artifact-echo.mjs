import data from './artifact-echo-data.json' with {type:'json'};
import support from './artifact-support-data.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
export const ARTIFACT_ECHOES=data.records.filter(r=>fellowById(r.fellow));
export const ARTIFACT_SUPPORTS=support.records;
const rules=new Map([...ARTIFACT_ECHOES,...ARTIFACT_SUPPORTS].map(r=>[r.item,r]));
export const artifactEchoEligible=(s,id,r)=>!!r&&(r.family?Object.hasOwn(s.family,r.family):r.fellow===id);
export const artifactEchoRule=item=>rules.get(item)||null;
export function artifactEchoBonus(s,id){const f=s.fellows[id],e=s.artifacts?.echoes?.[f?.gear];return e&&(e.policyVersion===2?Object.hasOwn(s.family,e.family):e.fellow===id)?{aptitude:e.aptitude,percent:e.percent}:{aptitude:0,percent:0}}
export function validArtifactEchoes(s){const e=s.artifacts?.echoes;if(e===undefined)return true;if(!e||typeof e!=='object'||Array.isArray(e))return false;return Object.entries(e).every(([item,x])=>{const r=rules.get(item);return r&&x&&(r.family?x.policyVersion===2&&x.family===r.family&&x.fellow===undefined:x.policyVersion===1&&x.fellow===r.fellow&&x.family===undefined)&&x.skill===r.skill&&Number.isInteger(x.aptitude)&&x.aptitude>0&&x.aptitude<=1000&&Number.isInteger(x.percent)&&x.percent>0&&x.percent<=100&&Number.isSafeInteger(x.activatedAt)&&x.activatedAt>=0&&x.activatedAt<=s.lastAt})}
export function enableArtifactEcho(s,id){const f=s.fellows[id],r=rules.get(f?.gear);if(!artifactEchoEligible(s,id,r))return {state:s,error:r?.family?`Welcome Family ${r.name} before enabling this equipped artifact.`:'Equip this artifact on its named Echo Fellow first.'};if(s.artifacts?.echoes?.[r.item])return {state:s,error:'This Echo is already enabled.'};const a=s.artifacts||{ore:0,bag:{}};return {state:{...s,artifacts:{...a,echoes:{...a.echoes,[r.item]:{...(r.family?{family:r.family}:{fellow:r.fellow}),skill:r.skill,aptitude:r.aptitude,percent:r.percent,activatedAt:s.lastAt,policyVersion:r.family?2:1}}}},message:`${r.name} ${r.family?'support':'Echo'} enabled · +${r.aptitude} Aptitude and +${r.percent}% Power ${r.family?'while equipped and Family is present':'while matched'}.`}}
