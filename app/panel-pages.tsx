import {useState,Children,createContext,useContext,Fragment,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogClose,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const SystemMenuContext=createContext('');
const SystemResources=createContext<ReactNode>(null);
// Facilities entered from the Drakenberg town show their scene first; their pages open on tap instead of immediately.
const SystemAutoOpen=createContext(true);
export function SystemMenus({name,children,resources=null,autoOpen=true}:{name:string,children:ReactNode,resources?:ReactNode,autoOpen?:boolean}){return <SystemAutoOpen.Provider value={autoOpen}><SystemResources.Provider value={resources}><SystemMenuContext.Provider value={name}>{children}</SystemMenuContext.Provider></SystemResources.Provider></SystemAutoOpen.Provider>}
/** Character panel shapes, measured off the original at 720x1280 (screen audit, shared rows).
 *  shallow  — a tray that only holds a picker and its actions (Gifts: 445px of 1280, 35%).
 *  standard — the default sheet for a page with a few cards (~46dvh).
 *  tall     — a whole system with its own map or list (Stella: 670px of 1280, 52%).
 *  centered — a focused overlay with its own hero art, dimmed over the screen (Artifact).
 *  full     — the one panel that leaves only a strip of art above it (Awaken: top edge y~210 of 1280).
 *  All four leave the icon dock visible and usable: it is how you move between pages now that the
 *  generic Previous/Next footer is gone. */
export const PANEL_VARIANTS=['shallow','standard','tall','full','centered'] as const;
export type PanelVariant=typeof PANEL_VARIANTS[number];
const icons:Record<string,string>={Profile:'overview',Overview:'overview',Level:'level',Dates:'bonds',Gifts:'gifts','More gifts':'gifts',Bonds:'bonds',Blessings:'rank',Pictures:'overview',Wardrobe:'relics',Skills:'mastery',Equipment:'relics',Stella:'rank',Welcome:'bonds',
 // The Family dock's five (docs/family-screen-specs/02-member-shell.md).
 Blessing:'level',Interact:'overview','Original businesses':'building','Inn service':'building',Workshop:'building','Magic Farm':'building','Starter businesses':'building',Pupils:'bonds',Graduate:'rank',Opening:'overview',Classic:'gifts',Milestones:'rank',Familiars:'bonds',Tower:'rank',Exploring:'mastery',Dispatch:'building',Museum:'relics',Keepsakes:'relics',Materials:'relics',Supplies:'gifts',Counter:'building',Roam:'building',Encounters:'bonds','Open counter':'building','Camp & exchange':'mastery','Brew & stock':'gifts','Recipe visitors':'bonds',Negotiate:'mastery',Exchange:'gifts',Records:'overview',Wish:'rank',Rewards:'gifts',Recruit:'bonds',Host:'building',Expedition:'building',Appraisal:'mastery','Relic collection':'relics'};
/** `bare` names dock entries that have NO panel. docs/fellow-screen-specs/03-upgrade.md's key finding:
 *  tapping `Upgrade` closes whatever panel is open and returns to the bare shell, because the shell IS
 *  the Upgrade screen. Its child is still passed (so indices stay aligned) and simply never rendered. */
export default function PanelPages({labels,children,initialPage=0,popup=false,personName='Character',selectedPage,onPageChange,variant='standard',variants,bare,dockClass}:{labels:string[],children:ReactNode,initialPage?:number,popup?:boolean,personName?:string,selectedPage?:number,onPageChange?:(page:number)=>void,variant?:PanelVariant,variants?:Record<string,PanelVariant>,bare?:string[],dockClass?:string}){
 const resources=useContext(SystemResources),autoOpen=useContext(SystemAutoOpen),facility=useContext(SystemMenuContext),systemPopup=!!facility&&!popup,title=systemPopup?facility:personName;
 const isBare=(i:number)=>!!bare?.includes(labels[i]);
 const [page,setLocalPage]=useState(initialPage),[open,setOpen]=useState(systemPopup&&autoOpen&&!bare?.includes(labels[initialPage]));const pages=Children.toArray(children),active=Math.min(selectedPage??page,Math.max(0,pages.length-1));
 const setPage=(next:number)=>{setLocalPage(next);onPageChange?.(next)};
 // A system sheet has no dock of its own behind it, so it keeps the paging footer and stays modal.
 const shape=systemPopup?'system':(variants?.[labels[active]]||variant);
 if(popup||systemPopup)return <div className={systemPopup?'system-menu':'character-menu'}><nav className={(systemPopup?'system-action-dock':'character-action-dock')+(dockClass&&!systemPopup?' '+dockClass:'')} aria-label={title+' actions'}>{labels.map((label,i)=><Button key={label} variant="outline" aria-haspopup="dialog" aria-pressed={!systemPopup&&active===i&&(isBare(i)?!open:open)} onClick={()=>{setPage(i);setOpen(!isBare(i))}}><img src={'./assets/menu/'+(icons[label]||'overview')+'.png'} alt=""/><span>{label}</span></Button>)}</nav><Dialog open={open} onOpenChange={setOpen} modal={systemPopup} disablePointerDismissal={!systemPopup}><DialogContent className={'character-sheet '+(systemPopup?'system-sheet':'panel-'+shape)} overlayClassName={systemPopup?undefined:'character-sheet-backdrop'} showCloseButton={false}>{systemPopup&&resources}<header className="character-sheet-heading"><div><DialogDescription>{title}</DialogDescription><DialogTitle>{labels[active]}</DialogTitle></div><DialogClose className="character-sheet-close" aria-label={'Back to '+title}>×</DialogClose></header><div className="character-sheet-body" key={active} tabIndex={0} aria-label={labels[active]+' details'}><SystemMenuContext.Provider value="">{pages[active]}</SystemMenuContext.Provider></div>{systemPopup&&<footer className="character-sheet-footer"><Button variant="outline" disabled={active===0} onClick={()=>setPage(active-1)}>Previous</Button><span>{active+1} / {labels.length}</span><Button variant="outline" disabled={active===labels.length-1} onClick={()=>setPage(active+1)}>Next</Button></footer>}</DialogContent></Dialog></div>;
 return <div className="panel-book"><nav className="panel-pages" aria-label="Panel pages">{labels.map((label,i)=><Button key={label} variant="outline" aria-pressed={active===i} onClick={()=>setPage(i)}>{label}</Button>)}</nav><section key={active} aria-label={labels[active]} className="panel-page">{pages[active]}</section></div>
}

export function ActivityPages({options,value,onChange,children}:{options:string[][],value:string,onChange:(value:string)=>void,children:ReactNode}){
 const selected=Math.max(0,options.findIndex(([id])=>id===value));
 return <PanelPages labels={options.map(([,label])=>label)} selectedPage={selected} onPageChange={i=>onChange(options[i][0])}>{options.map(([id],i)=><Fragment key={id}>{i===selected?children:null}</Fragment>)}</PanelPages>;
}
