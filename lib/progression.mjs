// Milestone rewards and rank thresholds are local balance, not recovered original values.
/** @type {Array<{id:string,name:string,detail:string,goal:number,metric:(s:any)=>number,reward:Record<string,number>,xp:number}>} */
export const MILESTONES=[
 {id:'earn500',name:'A thriving stall',detail:'Collect 500 gold from businesses',goal:500,metric:s=>s.earned,reward:{gold:200,gift1:5},xp:50},
 {id:'threeFellows',name:'Helping hands',detail:'Recruit 3 Fellows',goal:3,metric:s=>Object.keys(s.fellows).length,reward:{gold:400,gift3:5},xp:50},
 {id:'threeBusinesses',name:'Open for business',detail:'Open 3 businesses',goal:3,metric:s=>Object.keys(s.buildings).length,reward:{gold:600,gift2:3},xp:50},
 {id:'twoFamily',name:'A place to call home',detail:'Welcome 2 family members',goal:2,metric:s=>Object.keys(s.family).length,reward:{gold:200,gift4:3},xp:50},
 {id:'fiveGifts',name:'Small kindnesses',detail:'Give 5 gifts',goal:5,metric:s=>s.stats.gifts,reward:{gold:300,gift5:2},xp:50},
 {id:'threeDates',name:'Time together',detail:'Go on 3 random dates',goal:3,metric:s=>s.stats.dates,reward:{gold:300,gift3:5},xp:50},
 {id:'firstBlessing',name:'A family blessing',detail:'Upgrade a family skill',goal:1,metric:s=>Object.values(s.family).reduce((n,f)=>n+f.skill,0),reward:{gold:500,gift4:5},xp:50},
];
MILESTONES.push(
 {id:'clear5',name:'First expedition',detail:'Clear 5 campaign stages',goal:5,metric:s=>s.adventure.cleared,reward:{gold:1000,gift2:5},xp:50},
 {id:'clear15',name:'Across the valley',detail:'Clear 15 campaign stages',goal:15,metric:s=>s.adventure.cleared,reward:{gold:3000,gift4:10},xp:50},
 {id:'aptitude15',name:'Growing potential',detail:'Raise a Fellow’s base Aptitude to 15',goal:15,metric:s=>Math.max(...Object.values(s.fellows).map(f=>f.aptitude)),reward:{gold:1500,gift3:5},xp:50},
 {id:'graduate1',name:'A bright future',detail:'Graduate a pupil',goal:1,metric:s=>s.school.graduates,reward:{gold:500,gift1:5},xp:50},
);
export const rankXP=s=>MILESTONES.filter(m=>s.claims.includes(m.id)).reduce((n,m)=>n+m.xp,0);
export const playerRank=s=>1+Math.floor(rankXP(s)/100);
export const energyCap=s=>3+playerRank(s)-1;
export const ENERGY_RECOVERY_MS=60000;
export const blessingCost=family=>20*(family.skill+1);
export const familyBonus=s=>Object.values(s.family).reduce((n,f)=>n+f.skill*.01,0);
