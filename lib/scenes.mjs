import original from './original-scenes.mjs';
export const SCENES=original.scenes;
export const sceneFor=id=>SCENES.find(s=>s.characterId===id)||null;
// The original player-name token is substituted only at display time; source text is retained.
export const sceneText=text=>(text||'').replaceAll('{playerName}','Village Elder').replace(/\[\/?(?:color|size|b|i)(?:=[^\]]*)?\]/g,'');
export function sceneLine(scene,index){return scene?.lines[Math.max(0,Math.min(scene.lines.length-1,Number.isInteger(index)?index:0))]||null;}
