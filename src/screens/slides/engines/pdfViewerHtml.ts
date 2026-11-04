// The page the slide viewer's WebView runs: Mozilla pdf.js renders ONE page at a time onto a canvas,
// scaled to fit the WebView (sharp on high-density screens). No native module is needed (pdf.js runs
// inside react-native-webview, already in the app), so adding slides needs no native rebuild.
//
// Protocol (every command is injected JS; the page answers with postMessage JSON):
//   app -> page: window.__slides.open(base64, page)   window.__slides.show(page)
//   page -> app: {t:'ready'} {t:'loaded', total, aspect} {t:'page', n} {t:'swipe', dir} {t:'error', code}
//
// pdf.js is loaded from cdnjs (pinned) for now, so the viewer needs a connection the first time it
// opens. Bundle it as a local asset to make cached decks fully offline.

export const PDFJS_VERSION = '3.11.174';
export const PDFJS_ORIGIN = 'https://cdnjs.cloudflare.com';
const PDFJS_BASE = `${PDFJS_ORIGIN}/ajax/libs/pdf.js/${PDFJS_VERSION}`;

export type PdfViewerMessage =
  | { t: 'ready' }
  | { t: 'loaded'; total: number; aspect: number }
  | { t: 'page'; n: number }
  | { t: 'swipe'; dir: 'next' | 'prev' }
  | { t: 'error'; code: string; msg?: string };

/** Parse a page message; anything malformed is ignored (null). */
export function parseViewerMessage(data: string): PdfViewerMessage | null {
  let m: unknown;
  try { m = JSON.parse(data); } catch { return null; }
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  switch (o.t) {
    case 'ready': return { t: 'ready' };
    case 'loaded': {
      const total = Number(o.total);
      const aspect = Number(o.aspect);
      if (!Number.isInteger(total) || total < 1) return null;
      return { t: 'loaded', total, aspect: Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9 };
    }
    case 'page': return Number.isInteger(o.n) ? { t: 'page', n: o.n as number } : null;
    case 'swipe': return o.dir === 'next' || o.dir === 'prev' ? { t: 'swipe', dir: o.dir } : null;
    case 'error': return { t: 'error', code: typeof o.code === 'string' ? o.code.slice(0, 40) : 'unknown', ...(typeof o.msg === 'string' ? { msg: o.msg.slice(0, 200) } : {}) };
    default: return null;
  }
}

export function buildPdfViewerHtml(background: string): string {
  // background comes from the colour tokens (a #hex); JSON.stringify keeps it a plain string literal.
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;height:100%;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
#w{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}canvas{display:block}</style>
<script src="${PDFJS_BASE}/pdf.min.js"></script></head>
<body><div id="w"></div><script>
document.body.style.background=${JSON.stringify(background)};
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
var doc=null,want=1,shown=0,busy=false;
function render(){
  if(!doc||busy)return;var n=want;busy=true;
  doc.getPage(n).then(function(p){
    var v1=p.getViewport({scale:1});var W=window.innerWidth,H=window.innerHeight;
    var s=Math.min(W/v1.width,H/v1.height),dpr=window.devicePixelRatio||1;
    var vp=p.getViewport({scale:s*dpr});var c=document.createElement('canvas');
    c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);
    c.style.width=Math.floor(vp.width/dpr)+'px';c.style.height=Math.floor(vp.height/dpr)+'px';
    return p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){
      var w=document.getElementById('w');w.innerHTML='';w.appendChild(c);});
  }).then(function(){busy=false;shown=n;send({t:'page',n:n});if(want!==shown)render();})
    .catch(function(e){busy=false;send({t:'error',code:'render_failed',msg:String(e&&e.message||e)});});
}
window.__slides={
  open:function(b64,page){
    try{var raw=atob(b64),u=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);
      want=page||1;
      pdfjsLib.getDocument({data:u,isEvalSupported:false}).promise.then(function(d){doc=d;return d.getPage(1);})
        .then(function(p){var v=p.getViewport({scale:1});want=Math.min(Math.max(1,want),doc.numPages);
          send({t:'loaded',total:doc.numPages,aspect:v.width/v.height});render();})
        .catch(function(e){send({t:'error',code:'bad_pdf',msg:String(e&&e.message||e)});});
    }catch(e){send({t:'error',code:'bad_pdf',msg:String(e&&e.message||e)});}
  },
  show:function(n){if(!doc)return;want=Math.min(Math.max(1,n),doc.numPages);if(want!==shown)render();}
};
var rz=null;window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){shown=0;render();},120);});
var sx=0,sy=0;
document.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY;},{passive:true});
document.addEventListener('touchend',function(e){var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
  if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5)send({t:'swipe',dir:dx<0?'next':'prev'});},{passive:true});
if(window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc=${JSON.stringify(`${PDFJS_BASE}/pdf.worker.min.js`)};send({t:'ready'});}
else send({t:'error',code:'viewer_unavailable'});
</script></body></html>`;
}
