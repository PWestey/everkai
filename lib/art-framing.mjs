import data from './art-bounds-data.json' with {type:'json'};
/** Where the art sits in a character render, measured by scripts/measure-art-bounds.mjs.
 *  Returns {bounds:[x0,y0,x1,y1], surround:'#rrggbb'} for a render drawn inside a flat viewer surround,
 *  or null for a render whose art (or scenery) fills its 2:3 frame. */
export function artBounds(path){const row=data.assets[String(path||'').replace(/^\.?\/?assets\//,'')];return row?.bounds?{bounds:row.bounds,surround:row.surround}:null}
/** Measured motion of an idle clip: the fraction of pixels that change across 24 sampled frames. */
export const clipMotion=src=>data.assets[src]?.motion??null;

const FRAME_ASPECT=2/3,PAD=.03,MAX_ZOOM=2.5;
/** Zoom that brings a surround render's art to fill a media box, never shrinking what is shown today.
 *  box = the element's size; fit = its object-fit ('cover' | 'contain'); position = object-position as
 *  fractions [x,y]. Returns a CSS transform (origin 0 0), or null when the render needs none. */
// fill: a costume render is a rectangular painted card, not a lone figure, so in a cover layout it is
// zoomed until the card COVERS the box -- no surround margin, the character as large as the card allows --
// rather than fitted inside it. A lone figure must never do this: covering its tall box crops head and feet.
export function artTransform(bounds,box,fit='contain',position=[.5,.5],fill=false){
 if(!bounds||!(box?.width>0)||!(box?.height>0))return null;
 const {width:W,height:H}=box,k=(fit==='cover'?Math.max:Math.min)(W/FRAME_ASPECT,H);// k = content height
 const cw=k*FRAME_ASPECT,cl=(W-cw)*position[0],ct=(H-k)*position[1];
 const [x0,y0,x1,y1]=bounds,bw=(x1-x0)*cw,bh=(y1-y0)*k;if(!(bw>0&&bh>0))return null;
 const cover=fill&&fit==='cover',zoom=Math.min(MAX_ZOOM,Math.max(1,cover?Math.max(W/bw,H/bh):Math.min(W*(1-2*PAD)/bw,H*(1-2*PAD)/bh)));
 const cx=cl+(x0+x1)/2*cw,cy=ct+(y0+y1)/2*k;
 const tx=W/2-zoom*cx,ty=H/2-zoom*cy;
 if(zoom===1&&Math.abs(tx)<1&&Math.abs(ty)<1)return null;
 return `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${zoom.toFixed(4)})`;
}

/** Roster card placement: `width` and `left` in percent of the card's width, `top` in percent of its
 *  height (as CSS resolves them). The card is 206:280 and shows the head and torso. A full-frame render
 *  keeps the long-standing placement (150% wide, top-aligned, centred). A surround render is scaled so its
 *  art stands as tall on the card as a full-frame figure does (never wider than 130% of the card), centred
 *  on the art, with the top of the art just under the card's arch; the render always covers the card. */
export const CARD_ASPECT=206/280;
export function rosterArtPlacement(bounds){
 if(!bounds)return {width:150,left:-25,top:0};
 const cardH=100/CARD_ASPECT,[x0,y0,x1,y1]=bounds,artH=(y1-y0)*1.5,artW=x1-x0;
 const target=150*1.5*.93;// art height of a typical full-frame render, in % of card width
 const width=Math.max(100,Math.min(target/Math.max(artH,.01),130/Math.max(artW,.01)));
 const left=Math.min(0,Math.max(100-width,50-width*(x0+x1)/2));
 const top=Math.min(0,Math.max(cardH-width*1.5,cardH*.05-width*1.5*y0));
 return {width:+width.toFixed(2),left:+left.toFixed(2),top:+(top/cardH*100).toFixed(2)};
}
