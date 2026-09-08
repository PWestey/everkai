/* Serve video seeks from the complete, already-cached local asset. */
self.cachedMediaRange=async function(response,range){
 if(!range||!/^bytes=/i.test(range))return response;
 const match=/^bytes=(\d*)-(\d*)$/i.exec(range.trim());
 // Unsupported multi-range syntax can legally receive the complete representation.
 if(!match||(!match[1]&&!match[2]))return response;
 const bytes=await response.arrayBuffer(),size=bytes.byteLength;
 let start=match[1]?Number(match[1]):null,end=match[2]?Number(match[2]):null;
 const invalid=()=>new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`,'Accept-Ranges':'bytes'}});
 if((start!==null&&!Number.isSafeInteger(start))||(end!==null&&!Number.isSafeInteger(end))||!size)return invalid();
 if(start===null){if(!end)return invalid();start=Math.max(0,size-end);end=size-1;}
 else{end=end===null?size-1:Math.min(end,size-1);}
 if(start>=size||end<start)return invalid();
 const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(bytes.slice(start,end+1),{status:206,headers});
};
