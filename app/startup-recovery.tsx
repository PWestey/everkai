import {Component,type ReactNode} from 'react';
export default class StartupRecovery extends Component<{children:ReactNode},{error:Error|null,backupError:string|null}> {
 state:{error:Error|null,backupError:string|null}={error:null,backupError:null};
 static getDerivedStateFromError(error:Error){return {error};}
 download=()=>{
  try{
   const raw=localStorage.getItem('isekai-private-village-v1');
   if(raw===null){this.setState({backupError:'No saved village was found in this browser.'});return;}
   const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='isekai-village-recovery.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   this.setState({backupError:null});
  }catch{this.setState({backupError:'This browser could not access or download the saved village. Its stored data has not been cleared.'});}
 };
 render(){
  if(!this.state.error)return this.props.children;
  return <main style={{minHeight:'100dvh',boxSizing:'border-box',display:'grid',placeContent:'center',padding:24,background:'#153e36',color:'#fff5dc',font:'18px/1.5 system-ui,sans-serif',textAlign:'center'}}>
   <h1 style={{fontSize:28}}>Your village couldn’t open</h1><p>Your saved village has not been cleared.<br/>Try reloading, or download your save for safekeeping.</p>
   <a href="./" style={{display:'block',padding:'12px 20px',background:'#f3dca7',color:'#153e36',borderRadius:12,fontWeight:700}}>Reload village</a>
   <button onClick={this.download} style={{marginTop:12,padding:12,border:'1px solid #f3dca7',borderRadius:12,color:'inherit',background:'transparent'}}>Download saved village</button>
   {this.state.backupError&&<p role="status">{this.state.backupError}</p>}
   <details style={{marginTop:20,textAlign:'left',maxWidth:480,overflowWrap:'anywhere'}}><summary>Error details</summary><p>{this.state.error.message||'The app stopped while opening.'}</p></details>
  </main>;
 }
}
