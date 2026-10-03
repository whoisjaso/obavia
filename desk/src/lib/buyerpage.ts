/* The buyer's own page: what they owe, when, and every payment they've made,
   in their language, with a way to send a new insurance card. One HTML page,
   no app to install, no password: the link itself is signed by the server
   and only shows this one note. The Desk previews the same page. */
import { METHOD_LABEL, counts, money, standing, type Loan } from './loans';
import { askTotal } from './extras';
import { insuranceState } from './insurance';

export type PageDealer = { name: string; phone?: string; payUrl?: string; accent?: string };

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const day = (d: string, es: boolean, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) => new Date(d + 'T12:00:00Z').toLocaleDateString(es ? 'es-US' : 'en-US', { timeZone: 'UTC', ...opts });

const T = {
  en: { hi: 'Hi', next: 'Next payment', due: 'due', owe: 'Due now', paidOff: 'Paid in full. Thank you.', payoff: 'To pay it off today', pay: 'Pay Now', history: 'Your payments', none: 'No payments yet.', receipt: 'Receipt', ins: 'Insurance', insOk: 'On file, ends', insSoon: 'Ends soon:', insLapsed: 'Ended', insNone: 'No insurance on file.', send: 'Send your new insurance card', company: 'Insurance company', ends: 'Policy ends', photo: 'Photo of the card', sendBtn: 'Send', call: 'Questions? Call', sent: 'Thank you. We got your insurance card.' },
  es: { hi: 'Hola', next: 'Próximo pago', due: 'vence el', owe: 'Vencido ahora', paidOff: 'Pagado por completo. Gracias.', payoff: 'Para liquidarlo hoy', pay: 'Pagar Ahora', history: 'Sus pagos', none: 'Todavía no hay pagos.', receipt: 'Recibo', ins: 'Seguro', insOk: 'Registrado, vence el', insSoon: 'Vence pronto:', insLapsed: 'Venció el', insNone: 'No tenemos seguro registrado.', send: 'Envíe su nueva tarjeta de seguro', company: 'Compañía de seguro', ends: 'La póliza vence', photo: 'Foto de la tarjeta', sendBtn: 'Enviar', call: '¿Preguntas? Llame al', sent: 'Gracias. Recibimos su tarjeta de seguro.' },
};

export function buyerPage(l: Loan, asOf: string, d: PageDealer, opts: { action?: string; sent?: boolean; preview?: boolean } = {}) {
  const es = l.language === 'es', t = T[es ? 'es' : 'en'], s = standing(l, asOf), ask = askTotal(l, s), first = esc(l.buyer.name.split(' ')[0]);
  const ins = insuranceState(l, asOf), car = esc(l.vehicle.split(' · ')[0]), accent = /^#[0-9a-f]{3,8}$/i.test(d.accent ?? '') ? d.accent! : '#2F6FDB';
  const head = s.status === 'paid_off' ? `<h1>${t.paidOff}</h1>`
    : s.status === 'late' ? `<p class="cap">${t.owe}</p><p class="big">${money(ask)}</p>`
    : `<p class="cap">${t.next}</p><p class="big">${money(ask)}</p><p class="soft">${t.due} ${esc(day(s.next!.due, es))}</p>`;
  const pays = [...l.payments].filter(counts).reverse().slice(0, 24).map(p => `<li><b>${money(p.cents)}</b><span>${esc(day(p.on, es, { month: 'short', day: 'numeric', year: 'numeric' }))} · ${esc(METHOD_LABEL[p.method])}</span><small>${t.receipt} #${p.receipt}</small></li>`).join('');
  const insLine = ins.state === 'none' ? t.insNone : ins.state === 'lapsed' ? `${t.insLapsed} ${esc(day(l.insurance!.expires, es))}` : ins.state === 'soon' ? `${t.insSoon} ${esc(day(l.insurance!.expires, es))}` : `${t.insOk} ${esc(day(l.insurance!.expires, es))}`;
  const form = opts.sent ? `<p class="ok">${t.sent}</p>` : opts.action ? `<form method="post" action="${esc(opts.action)}" id="ins">
      <p class="cap">${t.send}</p>
      <label>${t.company}<input name="company" required maxlength="60" autocomplete="off"></label>
      <label>${t.ends}<input name="expires" type="date" required min="${asOf}"></label>
      <label>${t.photo}<input name="photo" type="file" accept="image/*" capture="environment"></label>
      <input type="hidden" name="data">
      <button class="btn">${t.sendBtn}</button></form>` : '';
  return `<!doctype html><html lang="${es ? 'es' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(d.name)}</title><style>
:root{--accent:${accent};--navy:#16233F;--muted:#5D6B85}
*{box-sizing:border-box}body{margin:0;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--navy);background:linear-gradient(#EAF2FF,#F8FBFF 40%)}
main{max-width:460px;margin:0 auto;padding:28px 16px 48px;text-align:center}
.dealer{font-weight:700;color:var(--accent);margin:0 0 28px}.cap{margin:0 0 4px;color:var(--muted);font-weight:500}
.big{margin:0;font-weight:800;font-size:clamp(56px,16vw,84px);letter-spacing:-.05em;line-height:1}.soft{color:var(--muted);margin:10px 0 0}
h1{font-size:30px;letter-spacing:-.03em;margin:8px 0}.card{background:#fff;border-radius:22px;box-shadow:0 10px 30px rgba(22,35,63,.08);padding:18px;margin:22px 0 0;text-align:left}
.btn{display:block;width:100%;border:0;border-radius:16px;background:var(--accent);color:#fff;font:700 17px/1 inherit;padding:17px;margin:22px 0 0;text-align:center;text-decoration:none}
ul{list-style:none;margin:8px 0 0;padding:0}li{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;padding:10px 0;border-top:1px solid #EEF2F8}li small{grid-column:2;color:var(--muted)}li span{color:var(--muted)}
label{display:block;margin:12px 0 0;font-weight:600;font-size:14px}input{display:block;width:100%;margin:6px 0 0;padding:13px;border:1px solid #D9E2F0;border-radius:12px;font:inherit}
.ok{color:#1F7A4D;font-weight:600}.foot{color:var(--muted);margin:26px 0 0;font-size:14px}a{color:var(--accent)}
</style></head><body><main>
<p class="dealer">${esc(d.name)}</p>
<p class="cap">${t.hi} ${first} · ${car}</p>
${head}
${s.status !== 'paid_off' ? `<p class="soft">${t.payoff}: ${money(s.payoffCents)}</p>` : ''}
${d.payUrl && s.status !== 'paid_off' ? `<a class="btn" href="${esc(d.payUrl)}">${t.pay}</a>` : ''}
<section class="card"><p class="cap">${t.ins}</p><p style="margin:0">${insLine}</p>${form}</section>
<section class="card"><p class="cap">${t.history}</p>${pays ? `<ul>${pays}</ul>` : `<p>${t.none}</p>`}</section>
${d.phone ? `<p class="foot">${t.call} <a href="tel:${esc(d.phone.replace(/[^\d+]/g, ''))}">${esc(d.phone)}</a></p>` : ''}
</main>${opts.action && !opts.sent && !opts.preview ? `<script>
document.getElementById('ins').addEventListener('submit',async function(e){var f=this,file=f.photo.files[0];if(!file)return;e.preventDefault();
var img=new Image();img.onload=function(){var k=Math.min(1,1100/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=img.width*k;c.height=img.height*k;
c.getContext('2d').drawImage(img,0,0,c.width,c.height);f.data.value=c.toDataURL('image/jpeg',0.7);f.photo.value='';f.submit();};img.src=URL.createObjectURL(file);});
</script>` : ''}</body></html>`;
}
