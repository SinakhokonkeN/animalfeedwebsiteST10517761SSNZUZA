/** Optional, dependency-free local server. Live Server works for static browsing;
 * this server additionally records AJAX form requests without pretending to send email. */
import http from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const IDS=new Set(['poultry-feed','cattle-feed','goat-feed','sheep-feed','pig-feed','vitamins-supplements']);
const PAGES=new Set(['index.html','about.html','products.html','product.html','services.html','gallery.html','quote.html','enquiry.html','contact.html','privacy.html','robots.txt','sitemap.xml','tests/responsive.html']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;}
export function validate(body,kind) {
  const errors={};const text=(key,max=2000)=>typeof body[key]==='string'?body[key].trim().slice(0,max+1):'';
  const data={kind,name:text('name',100),email:text('email',254),phone:text('phone',25),message:text('message'),consent:body.consent===true||body.consent==='on',requestId:text('requestId',80)||randomUUID()};
  if(data.name.length<2||data.name.length>100)errors.name='Name must contain 2–100 characters.';
  if(data.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))errors.email='Valid email required.';
  if(data.phone&&(!/^\+?[\d\s()-]{7,25}$/.test(data.phone)||data.phone.replace(/\D/g,'').length<7||data.phone.replace(/\D/g,'').length>15))errors.phone='Valid phone number required.';
  if(data.message.length>2000)errors.message='Message exceeds 2000 characters.';
  if(!data.consent)errors.consent='Consent required.';
  if(!/^[a-zA-Z0-9-]{8,80}$/.test(data.requestId))errors.requestId='Invalid request identifier.';
  if(text('website'))errors.website='Unable to accept request.';
  if(kind==='contact'){
    data.subject=text('subject',100);
    if(!['General question','Collection arrangements','Delivery question','Other'].includes(data.subject))errors.subject='Choose a message type.';
    if(data.message.length<10)errors.message='Message must contain at least 10 characters.';
  }else{
    data.fulfilment=text('fulfilment',20);data.area=text('area',160);data.requiredDate=text('requiredDate',10);
    if(!['collection','delivery'].includes(data.fulfilment))errors.fulfilment='Choose collection or delivery.';
    if(data.area.length>160||(data.fulfilment==='delivery'&&data.area.length<2))errors.area='Enter your area for delivery enquiries.';
    if(data.requiredDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(data.requiredDate)||Number.isNaN(Date.parse(data.requiredDate))||new Date(data.requiredDate).toISOString().slice(0,10)!==data.requiredDate||data.requiredDate<today()))errors.requiredDate='Choose today or a future date.';
    const raw=Array.isArray(body.items)?body.items:(body.category?[{id:body.category,quantity:Number(body.quantity)}]:[]);
    data.items=[];const seen=new Set();
    if(!raw.length||raw.length>6)errors.items='Choose between one and six feed categories.';
    for(const line of raw){
      if(!line||!IDS.has(line.id)||!Number.isInteger(Number(line.quantity))||Number(line.quantity)<1||Number(line.quantity)>999||seen.has(line.id)){errors.items='Invalid category or quantity.';break;}
      seen.add(line.id);data.items.push({id:line.id,quantity:Number(line.quantity)});
    }
  }
  return {errors,data};
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function parseBody(req){let content='';for await(const chunk of req){content+=chunk.toString();if(Buffer.byteLength(content)>16384)throw Object.assign(new Error('Too large'),{status:413});}
  if((req.headers['content-type']||'').includes('application/json'))return JSON.parse(content);
  if((req.headers['content-type']||'').includes('application/x-www-form-urlencoded'))return Object.fromEntries(new URLSearchParams(content));
  throw Object.assign(new Error('Unsupported format'),{status:415});
}
export function createApp({root=ROOT,dataDir=path.join(ROOT,'var','requests'),rateLimit=20}={}) {
  const rates=new Map();
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return json(res,400,{ok:false,message:'Invalid URL.'});}
    try{
      if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{service:'amashazi-requests',recording:true});
      if(['/api/contact','/api/enquiry'].includes(pathname)){
        if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{ok:false,message:'Use POST.'});}
        if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{return json(res,403,{ok:false,message:'Invalid origin.'});}if(origin.host!==req.headers.host)return json(res,403,{ok:false,message:'Cross-origin submissions are not accepted.'});}
        const ip=req.socket.remoteAddress||'local',now=Date.now();
        if(rates.size>5000)for(const [k,v]of rates)if(now-v.start>60000)rates.delete(k);
        let rate=rates.get(ip);if(!rate||now-rate.start>60000){rate={start:now,count:0};rates.set(ip,rate);}if(++rate.count>rateLimit){res.setHeader('Retry-After','60');return json(res,429,{ok:false,message:'Please wait before trying again.'});}
        const body=await parseBody(req);if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{ok:false,message:'Expected a form object.'});
        const kind=pathname.split('/').pop(),{errors,data}=validate(body,kind);
        if(Object.keys(errors).length)return json(res,422,{ok:false,message:'Check the form fields.',errors});
        await mkdir(dataDir,{recursive:true,mode:0o700});
        const hash=createHash('sha256').update(`${kind}:${data.requestId}`).digest('hex');
        const reference=`AM-${hash.slice(0,12).toUpperCase()}`;
        const record={...data,reference,recordedAt:new Date().toISOString(),emailSent:false};
        const file=path.join(dataDir,`${hash}.json`);
        // Exclusive creation makes retrying the same request idempotent.
        try{await writeFile(file,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});}
        catch(error){if(error.code!=='EEXIST')throw error;const existing=JSON.parse(await readFile(file,'utf8'));if(JSON.stringify({...existing,reference:undefined,recordedAt:undefined,emailSent:undefined})!==JSON.stringify({...data,reference:undefined,recordedAt:undefined,emailSent:undefined}))return json(res,409,{ok:false,message:'Prepare a new summary before resubmitting changed details.'});}
        if(!(req.headers.accept||'').includes('application/json')){
          res.writeHead(201,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Request recorded</title><h1>Request recorded</h1><p>Reference: ${reference}. No email has been sent. Stock and pricing are subject to confirmation.</p><p><a href="/index.html">Return to Amashazi</a></p></html>`);return;
        }
        return json(res,201,{ok:true,reference,emailSent:false,message:'Recorded on the website server. Pricing and availability require confirmation.'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{ok:false,message:'Method not allowed.'});
      const relative=pathname==='/'?'index.html':pathname.replace(/^\//,'');
      const permitted=PAGES.has(relative)||/^(?:css|js)\/[a-zA-Z0-9.-]+\.(?:css|js)$/.test(relative)||/^assets\/images\/[a-zA-Z0-9.-]+\.(?:jpg|svg)$/.test(relative);
      if(!permitted)return json(res,404,{ok:false,message:'Page not found.'});
      const file=path.resolve(root,relative);if(!file.startsWith(path.resolve(root)+path.sep))return json(res,404,{ok:false});
      const info=await stat(file);if(!info.isFile())return json(res,404,{ok:false});
      const data=await readFile(file);res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){if(res.headersSent){res.end();return;}json(res,error.status||(error instanceof SyntaxError?400:error.code==='ENOENT'?404:500),{ok:false,message:error.code==='ENOENT'?'Not found.':'Request could not be completed.'});}
  });
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const portFlag=process.argv.indexOf('--port');const port=Number(process.env.PORT||(portFlag>=0?process.argv[portFlag+1]:3000));createApp().listen(port,'0.0.0.0',()=>console.log(`Amashazi website: http://localhost:${port}`));}
