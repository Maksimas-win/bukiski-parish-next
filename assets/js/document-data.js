// Shared validation for downloaded document envelopes. No browser storage is used.
const types={pdf:'application/pdf',doc:'application/msword'};
export function documentPath(document,lang){
  if(!['ru','lt','en'].includes(lang))throw new Error('Unsupported document language');
  const match=/^assets\/documents\/([a-z0-9-]+)\.(pdf|doc)$/.exec(document.local||'');
  if(!match)throw new Error('Invalid document path');
  return `/${lang}/documents/${match[1]}.html`;
}

export async function decodeDocument({filename,mime,bytes,sha256,base64}){
  const match=/^[a-z0-9-]+\.(pdf|doc)$/.exec(filename||'');
  const size=Number(bytes);
  if(!match||types[match[1]]!==mime||!Number.isSafeInteger(size)||size<1||size>5*1024*1024||!/^[a-f0-9]{64}$/.test(sha256||''))throw new Error('Invalid document metadata');
  if(typeof base64!=='string'||base64.length!==4*Math.ceil(size/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new Error('Invalid document encoding');
  const content=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  if(content.length!==size)throw new Error('Incomplete document');
  const signature=match[1]==='pdf'?[37,80,68,70,45]:[208,207,17,224,161,177,26,225];
  if(!signature.every((value,i)=>content[i]===value))throw new Error('Wrong document format');
  const digest=await crypto.subtle.digest('SHA-256',content);
  const actual=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(actual!==sha256)throw new Error('Document checksum mismatch');
  return {content,filename,mime};
}
