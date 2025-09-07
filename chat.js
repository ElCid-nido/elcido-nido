// Chat logic (Cloudflare Worker + Resend)
const Fuse = window.Fuse;
const $ = (s, el=document) => el.querySelector(s);
const chat = $('#chat');
const inputForm = $('#inputForm');
const qInput = $('#q');
const leadForm = $('#leadForm');

let KB = [], BIZ = null, lastSubmitAt = 0;
const RATE_LIMIT_MS = 60000;
const WORKER_URL = "https://aurypet.spmighi.workers.dev/"; 

(async function bootstrap(){
  const [faq, biz] = await Promise.all([
    fetch('./faq.json', {cache:'no-store'}).then(r=>r.json()),
    fetch('./business.json', {cache:'no-store'}).then(r=>r.json())
  ]);
  KB = faq; BIZ = biz;
  renderBot('Ciao! Posso aiutarti con orari, indirizzo, contatti, reti per gatti, manutenzione acquari e dieta BARF. Prova: “rete per gatti balcone”.');
})();

function renderMsg(text, who='bot'){
  const wrap = document.createElement('div');
  wrap.className = `msg ${who==='user'?'user':'bot'}`;
  const b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  wrap.appendChild(b);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}
const renderBot = (t)=>renderMsg(t,'bot');

function renderAnswer(item){
  renderBot(item.a);
  const row = document.createElement('div');
  row.className = 'action-row';
  if(item.id==='indirizzo'){
    row.appendChild(btn('Apri in Maps', ()=> window.open(BIZ.map_url,'_blank')));
    row.appendChild(btn('Copia indirizzo', ()=> copy(BIZ.address)));
  }
  if(item.id==='contatti'){
    row.appendChild(btn('Chiama', ()=> window.open(`tel:${BIZ.phone.replace(/\s+/g,'')}`)));
    row.appendChild(btn('Scrivi email', ()=> window.open(`mailto:${BIZ.email}`)));
  }
  if(item.id==='orari'){
    row.appendChild(btn('Copia orari', ()=> copy(item.a)));
  }
  if(row.children.length){ chat.lastElementChild.appendChild(row); }
}
function btn(label, onClick){
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'action'; b.textContent = label; b.addEventListener('click', onClick); return b;
}
const copy = (t)=> navigator.clipboard?.writeText(t);

function search(q){
  const fuse = new Fuse(KB, { keys: ['q','a','category'], includeScore: true, threshold: 0.44, distance: 60, minMatchCharLength: 2 });
  const norm = q.toLowerCase().trim();
  const direct = KB.find(x => x.id === norm);
  if (direct) return [direct];
  const res = fuse.search(norm).sort((a,b)=>a.score-b.score).slice(0,3).map(r=>r.item);
  if (res.length===0 && norm.includes(' ')) {
    return fuse.search(norm.split(' ').slice(0,3).join(' ')).slice(0,2).map(r=>r.item);
  }
  return res;
}

function handleQuery(q){
  if(!q || !q.trim()) return;
  renderMsg(q.trim(), 'user');
  const hits = search(q);
  if(hits.length){
    const seen = new Set();
    hits.forEach(item => { if(!seen.has(item.id)) { renderAnswer(item); seen.add(item.id); } });
  } else {
    renderBot('Non ho trovato una risposta precisa. Vuoi inviare un messaggio? Compila il modulo qui sotto.');
  }
}

inputForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const val = qInput.value.slice(0,200);
  handleQuery(val);
  qInput.value = '';
});
document.querySelectorAll('[data-intent]').forEach(b=> b.addEventListener('click', ()=>{
  const id = b.getAttribute('data-intent'); const item = KB.find(x=>x.id===id); if(item) renderAnswer(item);
}));

leadForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const now = Date.now();
  if (now - lastSubmitAt < RATE_LIMIT_MS) return alert('Per favore attendi un minuto prima di un nuovo invio.');
  const data = Object.fromEntries(new FormData(leadForm).entries());
  if (data.website) return; // honeypot
  if (!data.consent) return alert('Serve il consenso per inviare.');

  const payload = {
    user_name: String(data.name||'').slice(0,80),
    user_email: String(data.email||'').slice(0,120),
    user_message: String(data.message||'').slice(0,1000),
    page_url: document.referrer || location.href,
    consent: !!data.consent,
    website: data.website || ""
  };

  try{
    const r = await fetch(WORKER_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(!r.ok) throw new Error('Server error');
    const out = await r.json();
    if(!out.ok) throw new Error(out.error || 'Send failed');
    lastSubmitAt = now;
    alert('Grazie! Ti contatteremo al più presto.');
    leadForm.reset();
  }catch(err){
    alert('Invio non riuscito. Riprovare più tardi o usare i contatti diretti.');
  }
});
