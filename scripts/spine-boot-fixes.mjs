// Boot placement fixes Everkai's shipped stills were re-rendered with (commits 0d93e0c and 7fa8df7,
// 2026-09-11), indexed like recipe.replacements. The render copy that held them is gone, so they are
// applied here. Each replacement is a rigid quad in its slot bone's local space: rotate by `rot`
// degrees and scale by `scale` about the quad's centre, then translate by (dx,dy) in that same space.
export const BOOT_FIXES={wife_116:[{rot:25,dx:40,dy:-40},{dx:40,dy:30,scale:.95}],wife_19c1:[null,{dx:-40,dy:40}]};
export function transformQuad(vertices,{dx=0,dy=0,rot=0,scale=1}){
 const n=vertices.length/2;let cx=0,cy=0;for(let i=0;i<n;i++){cx+=vertices[2*i]/n;cy+=vertices[2*i+1]/n}
 const r=rot*Math.PI/180,c=Math.cos(r)*scale,s=Math.sin(r)*scale;
 return vertices.map((_,i)=>{if(i%2)return null;const x=vertices[i]-cx,y=vertices[i+1]-cy;return [cx+c*x-s*y+dx,cy+s*x+c*y+dy]}).filter(Boolean).flat();
}

