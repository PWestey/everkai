import {useState,Children,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
export default function PanelPages({labels,children,initialPage=0}:{labels:string[],children:ReactNode,initialPage?:number}){
 const [page,setPage]=useState(initialPage);const pages=Children.toArray(children);
 return <div className="panel-book"><nav className="panel-pages" aria-label="Panel pages">{labels.map((label,i)=><Button key={label} variant="outline" aria-pressed={page===i} onClick={()=>setPage(i)}>{label}</Button>)}</nav><section key={page} aria-label={labels[page]} className="panel-page">{pages[page]}</section></div>
}
