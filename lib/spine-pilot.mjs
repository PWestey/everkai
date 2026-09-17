import data from './spine-pilot-data.json' with {type:'json'};

/** The live Spine playback pilot is off unless the page is opened with ?spine=1. Nothing is stored:
 *  players who never add the flag get exactly the idle clips they had, and the owner can compare both
 *  paths on one build by toggling the query string. */
export function spinePilotEnabled(search=typeof location==='undefined'?'':location.search){
 return new URLSearchParams(search).get('spine')==='1';
}

/** The packaged Spine model for this appearance, owned exactly like an idle clip: keyed by costume
 *  id (else the person's id), and only when both the owner and the costume match. */
export function spineModel(person){
 if(!person?.id)return null;
 const row=data.models[person.costumeId||person.id];
 return row&&row.owner===person.id&&(row.costumeId||null)===(person.costumeId||null)?row:null;
}

export const spinePilotModels=data.models;
