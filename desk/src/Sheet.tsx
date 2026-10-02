/* One design for every document the dealer authors: the dealer's letterhead,
   hairline rules, figures in a tabular face, the one sentence that matters in
   red, the same signature grid. Official state forms (130-U, VTR-271) print
   from the official PDF; here they preview as the fields that will be filled. */
import type React from 'react';
import { notSet, type DealerConfig } from './lib/config';
import { asFiled, financingTerms, lenderName, saleMoney } from './lib/filed';
import { DOC_TITLE } from './lib/documents';
import { usd } from './lib/money';
import { poaInstrument, type DocType } from './lib/plan';
import type { Sale } from './lib/sale';
import { photosOf } from './lib/condition';

export const saleReceipt = saleMoney;

const join = (...xs: (string | false | undefined | null)[]) => xs.filter(Boolean).join(' · ');
const cityLine = (d: { city: string; state: string; zip: string }) => [d.city, [d.state, d.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

export function Letterhead({ dealer, title, no, date, stock, es }: { dealer: DealerConfig; title?: string; no?: string; date?: string; stock?: string; es?: boolean }) {
  const name = dealer.dba || dealer.legalName;
  return (
    <header className="lh">
      <span className="logo" style={{ background: dealer.brand.logo ? '#fff' : dealer.brand.accent }}>{dealer.brand.logo ? <img src={dealer.brand.logo} alt="" /> : dealer.brand.monogram}</span>
      <span className="who">
        <b>{name}</b>
        {dealer.dba && dealer.legalName && dealer.legalName !== dealer.dba && <i>{dealer.legalName}</i>}
        <small>{join(dealer.street || notSet('Street'), cityLine(dealer))}</small>
        <small>{join(dealer.phone || notSet('Phone'), dealer.email, dealer.website)}</small>
      </span>
      {title && <span className="doc">
        <b>{title}</b>
        <dl>
          {no && <div><dt>No.</dt><dd>{no}</dd></div>}
          {date && <div><dt>{es ? 'Fecha' : 'Date'}</dt><dd>{date}</dd></div>}
          {stock && <div><dt>{es ? 'Inventario' : 'Stock'}</dt><dd>{stock}</dd></div>}
          <div><dt>GDN</dt><dd>{dealer.licence || notSet('Licence')}</dd></div>
        </dl>
      </span>}
    </header>
  );
}

/** Cars are stored with a swatch colour; paperwork names it the way a title does. */
const PAINT: [string, number[]][] = [['Black', [28, 30, 34]], ['White', [238, 240, 244]], ['Silver', [192, 197, 206]], ['Gray', [128, 134, 144]], ['Blue', [52, 78, 140]], ['Red', [168, 58, 58]], ['Green', [52, 110, 70]], ['Beige', [214, 198, 166]], ['Brown', [110, 76, 50]], ['Gold', [196, 160, 80]], ['Orange', [214, 110, 40]], ['Yellow', [230, 200, 60]]];
export function colourName(c: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(c?.trim() ?? '');
  if (!m) return c;
  const rgb = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  return PAINT.reduce((best, p) => { const d = p[1].reduce((t, v, i) => t + (v - rgb[i]) ** 2, 0); return d < best[1] ? [p[0], d] as [string, number] : best; }, ['', Infinity] as [string, number])[0];
}

const Cell = ({ k, v, className }: { k: string; v: React.ReactNode; className?: string }) => <div className={className}><small>{k}</small><b>{v || '\u00a0'}</b></div>;
const Box = ({ on, children }: { on: boolean; children: React.ReactNode }) => <span className={'box' + (on ? ' on' : '')}><i aria-hidden="true">{on ? '✓' : ''}</i>{children}</span>;

const Row = ({ k, v }: { k: string; v: string }) => <tr><td>{k}</td><td>{v}</td></tr>;

export function Sheet({ doc, sale: live, dealer: liveDealer, buyerSig, dealerSig, compact }: { doc: DocType; sale: Sale; dealer: DealerConfig; buyerSig?: string | null; dealerSig?: boolean; compact?: boolean }) {
  // Once filed, the sheet reads the facts it was filed with, never today's records.
  const f = asFiled(doc, live, liveDealer), sale = f.sale, dealer = f.dealer, date = f.date, signedOn = f.signedOn ?? date;
  const v = sale.vehicle, b = sale.buyer, r = saleReceipt(sale, dealer);
  const p = sale.step.paperwork?.[doc] ?? {}, bos = sale.step.paperwork?.billOfSale ?? {};
  const car = `${v.year} ${v.make} ${v.model}`;
  const funding = sale.step.funding;
  const lender = lenderName(funding);
  // The condition report prints in Spanish for a sale in Spanish; the buyer signs it in ink.
  const es = doc === 'conditionReport' && sale.language === 'es';
  const lien = funding?.type === 'lender' ? lender : r.balance > 0 || funding?.type === 'inHouse' ? dealer.legalName : null;

  const body = (() => {
    switch (doc) {
      case 'billOfSale': case 'salvageBillOfSale': return (<>
        <section className="parties">
          <div>
            <h4>Seller</h4>
            <b>{dealer.legalName || notSet('Legal name')}</b>
            <span>{dealer.street || notSet('Street')}</span>
            <span>{cityLine(dealer)}</span>
            {dealer.phone && <span>{dealer.phone}</span>}
            <span>Texas dealer licence (GDN) {dealer.licence || notSet('Licence')}</span>
          </div>
          <div>
            <h4>Purchaser</h4>
            <b>{b.fullName}</b>
            <span>{b.address}</span>
            <span>{cityLine(b)}</span>
            {b.phone && <span>{b.phone}</span>}
            {b.idNumber && <span>{{ dl: 'Driver licence', stateId: 'State ID', passport: 'Passport', military: 'Military ID' }[b.idType]} ending {b.idNumber.slice(-4)}</span>}
          </div>
        </section>
        <section className="vehicle">
          <h4>Vehicle</h4>
          <div className="grid">
            <Cell k="Year" v={v.year} /><Cell k="Make" v={v.make} /><Cell k="Model" v={v.model} className="w2" /><Cell k="Body" v={v.bodyStyle} /><Cell k="Colour" v={colourName(v.color)} />
            <Cell k="Vehicle identification number" v={<span className="mono">{v.vin}</span>} className="w4" /><Cell k="Odometer" v={v.mileage != null ? `${v.mileage.toLocaleString()} mi` : ''} className="num" /><Cell k="Stock" v={v.stock} />
          </div>
          <div className="odo">
            <span className="lbl">Odometer statement</span>
            <Box on={!bos.mileage || bos.mileage === 'actual'}>Actual mileage</Box>
            <Box on={bos.mileage === 'exceeds'}>Exceeds mechanical limits</Box>
            <Box on={bos.mileage === 'notActual'}>Not the actual mileage</Box>
          </div>
          {(doc === 'salvageBillOfSale' || v.titleStatus === 'rebuilt_salvage') && <p className="brand">{doc === 'salvageBillOfSale' ? 'Salvage title. This vehicle may not be driven on public roads.' : 'Rebuilt salvage title. The brand is permanent.'}</p>}
        </section>
        <section className="split">
          <div className="terms">
            <h4>Terms</h4>
            <div className="boxes">
              <Box on={bos.asIs !== 'warranty'}>Sold as is, no warranty</Box>
              <Box on={bos.asIs === 'warranty'}>Warranty{bos.asIs === 'warranty' && bos.warrantyLength ? `: ${bos.warrantyLength}` : ''}</Box>
            </div>
            <p>As stated on the Buyer’s Guide, which is part of this sale. {funding?.type === 'cash' ? `Paid by ${String(bos.payMethod ?? 'cash').toLowerCase()}.` : lender ? `Financed through ${lender}.` : funding?.type === 'inHouse' ? `Financed by ${dealer.legalName}.` : ''}</p>
            {r.tradeIn > 0 && <p>Trade-in accepted{bos.tradeDesc ? `: ${bos.tradeDesc}` : ''}.</p>}
            <p>The seller transfers the vehicle above to the purchaser for the price stated, and the purchaser accepts it.</p>
          </div>
          <div className="ledger">
            <table className="num"><tbody>
              <Row k="Cash price" v={usd(r.salePrice)} />
              <Row k="Documentary fee" v={usd(r.doc)} />
              <Row k={`Sales tax ${(dealer.fees.taxRate * 100).toFixed(2)}%`} v={usd(r.tax)} />
              <Row k="Title fee" v={usd(r.title)} />
              <Row k="Registration fee" v={usd(r.registration)} />
              {r.tradeIn > 0 && <Row k="Trade-in allowance" v={`−${usd(r.tradeIn)}`} />}
            </tbody><tfoot>
              <tr className="total"><td>Total</td><td>{usd(r.total)}</td></tr>
              <Row k="Paid today" v={usd(r.paidToday)} />
              <tr className={r.balance > 0 ? 'owed' : ''}><td>Balance due</td><td>{usd(r.balance)}</td></tr>
            </tfoot></table>
          </div>
        </section>
        {r.balance > 0 && <p className="key">Balance owed by the buyer to the seller under this bill of sale: {usd(r.balance)}, secured by a lien in favour of {dealer.legalName || notSet('Legal name')}.</p>}
        {/* Texas doc-fee notice (43 TAC §215.155). Wording to be confirmed with counsel before the first live sale. */}
        <p className="notice">A documentary fee is not an official fee. A documentary fee is not required by law, but may be charged to buyers for handling documents relating to the sale. A documentary fee may not exceed a reasonable amount agreed to by the parties. This notice is required by law.</p>
      </>);
      case 'form130U': return (<>
        <p className="official">Printed on the official TxDMV Form 130-U. These are the fields that will be filled.</p>
        <table><tbody>
          <Row k="Applicant" v={`${b.fullName}${p.buyerKind === 'business' ? ' (business)' : ''}`} /><Row k="Address" v={`${b.address}, ${b.city}, ${b.state} ${b.zip}`} />
          <Row k="County" v={p.county || b.county} /><Row k="ID" v={`${{ dl: 'Driver licence', stateId: 'State ID', passport: 'Passport', military: 'Military ID' }[b.idType]} ${b.idNumber}${p.idState ? `, issued by ${p.idState}` : ''}`} />
          <Row k="Vehicle" v={`${car} · ${v.bodyStyle}`} /><Row k="VIN" v={v.vin} /><Row k="Odometer" v={`${v.mileage?.toLocaleString() ?? ''}`} />
          <Row k="Empty weight" v={p.emptyWeight ? `${Number(p.emptyWeight).toLocaleString()} lb` : ''} />{p.capacity && <Row k="Carrying capacity" v={p.capacity} />}
          <Row k="Applying for" v={{ both: 'Title and registration', title: 'Title only', registration: 'Registration only' }[p.applyingFor as string] ?? ''} />
          <Row k="Sales price" v={usd(r.salePrice)} /><Row k="First lienholder" v={lien ?? 'None'} />
        </tbody></table>
      </>);
      case 'financing': {
        const t = financingTerms(sale, dealer), fq = { weekly: 'weekly', biweekly: 'every two weeks', monthly: 'monthly' }[p.frequency as string] ?? '';
        return (<>
          <table className="num"><tbody>
            <Row k="Cash price, tax and fees" v={usd(r.total)} /><Row k="Down payment" v={usd(t.down)} /><Row k="Amount financed" v={usd(t.principal)} />
            <Row k="Rate (APR)" v={`${t.rate.toFixed(2)}%`} /><Row k="Payments" v={Number.isFinite(t.count) ? `${t.count} × ${usd(t.payment)}, ${fq}` : 'The payment does not cover the interest'} />
            <Row k="First payment due" v={p.firstDue ?? ''} />
          </tbody></table>
          <p className="key">{t.held ? `The agreed figures came to more than the ${t.ceiling}% ceiling, so the rate is held at ${t.ceiling}% and the payment recomputed.` : `The rate is within the ${t.ceiling}% ceiling (Texas Finance Code).`}</p>
        </>);
      }
      case 'conditionReport': {
        const c = sale.step.paperwork?.conditionReport ?? {}, bos = sale.step.paperwork?.billOfSale ?? {};
        const pics = photosOf(c.photos), warranty = bos.asIs === 'warranty';
        const w = es ? {
          h: 'Estado del vehículo al venderse', car: 'Vehículo', vin: 'Número de identificación del vehículo (VIN)', odo: 'Odómetro', mi: 'millas', sold: 'Vendido',
          warranty: 'Con garantía', asIs: 'Como está, sin garantía', guide: 'Guía del Comprador en la ventana', drove: 'El comprador lo manejó de prueba', noLights: 'Sin luces de advertencia',
          lights: 'Luces de advertencia', none: 'Ninguna', known: 'No funcionaba al venderse', nothing: 'Nada conocido', photos: 'Fotos', taken: (n: number) => `${n} tomadas hoy`, noPhotos: 'Ninguna',
          key: warranty ? 'Las reparaciones fuera de la garantía escrita son responsabilidad del comprador.' : 'El vehículo se vende como está. Las reparaciones después de hoy son responsabilidad del comprador.',
          pay: 'Los pagos se deben aunque el vehículo necesite reparaciones.',
        } : {
          h: 'Condition at sale', car: 'Vehicle', vin: 'Vehicle identification number', odo: 'Odometer', mi: 'mi', sold: 'Sold',
          warranty: 'With a warranty', asIs: 'As is, no warranty', guide: 'Buyers Guide on the window', drove: 'Buyer test drove it', noLights: 'No warning lights',
          lights: 'Warning lights', none: 'None', known: 'Not working at sale', nothing: 'Nothing known', photos: 'Photos', taken: (n: number) => `${n} taken today`, noPhotos: 'None',
          key: warranty ? 'Repairs outside the written warranty are the buyer’s.' : 'The car is sold as is. Repairs after today are the buyer’s.',
          pay: 'Payments are due whether or not it needs repairs.',
        };
        return (<>
          <section className="vehicle">
            <h4>{w.h}</h4>
            <div className="grid">
              <Cell k={w.car} v={car} className="w2" /><Cell k={w.vin} v={<span className="mono">{v.vin}</span>} className="w4" />
              <Cell k={w.odo} v={v.mileage != null ? `${v.mileage.toLocaleString()} ${w.mi}` : ''} className="w2" /><Cell k={w.sold} v={warranty ? `${w.warranty}${bos.warrantyLength ? `: ${bos.warrantyLength}` : ''}` : w.asIs} className="w4" />
            </div>
            <div className="odo">
              <Box on={c.guide === 'yes'}>{w.guide}</Box>
              <Box on={c.drove === 'yes'}>{w.drove}</Box>
              <Box on={c.lights === 'none'}>{w.noLights}</Box>
            </div>
          </section>
          <table className="cond"><tbody>
            <Row k={w.lights} v={c.lights === 'yes' ? c.lightsWhich ?? '' : w.none} />
            <Row k={w.known} v={c.known === 'yes' ? c.knownWhat ?? '' : w.nothing} />
            <Row k={w.photos} v={pics.length ? w.taken(pics.length) : w.noPhotos} />
          </tbody></table>
          {pics.length > 0 && <div className="pics">{pics.map((p, i) => <img key={i} src={p} alt={`Photo ${i + 1}`} />)}</div>}
          <p className="key">{w.key} {w.pay}</p>
        </>);
      }
      case 'vehicleResponsibility': return (<>
        <p>The buyer is filing the title and registration for the {car} (VIN {v.vin}) and will do so within 30 days of {date}.</p>
        <p className="key">If the filing comes back to the dealer, the buyer owes {usd(r.registrationCost)} for tax and fees, plus any late fee the county charges (Tex. Transp. Code §501.146: $10 to a licensed dealer, and $25 more for each 30 days after the 60th day, up to $250).</p>
      </>);
      case 'insuranceAcknowledgment': return (<>
        <p>The buyer did not show proof of insurance today. Texas law requires it before the {car} is driven. The dealer is not the buyer’s insurer.</p>
        <p className="key">The buyer will get insurance before driving, and registration waits on proof.</p>
      </>);
      case 'powerOfAttorney': {
        const inst = poaInstrument(new Date().getFullYear(), v.year);
        return (<p className="official">{inst === 'VTR-271' ? 'Printed on the official Form VTR-271.' : 'Signed in ink on the county’s secure Form VTR-271-A.'} The buyer appoints {dealer.legalName} to sign the title application for the {car}, VIN {v.vin}. Its odometer disclosure is a wet signature, so it is never signed on a screen.</p>);
      }
      case 'rebuiltDisclosure': return (<>
        <p className="key">This vehicle has a rebuilt salvage title. The brand is permanent and affects its value.</p>
        <p>The buyer was given the chance to inspect the vehicle before signing anything else.</p>
        <table><tbody><Row k="Year" v={String(v.year)} /><Row k="Make" v={v.make} /><Row k="VIN" v={v.vin} /></tbody></table>
        {/* TxDMV Form ENF-MV-RBLT DSCLMR (Rev. 02/17), the purchaser's sentence, word for word. */}
        <p className="official">“I, {b.fullName}, acknowledge that at the time of purchase, I am aware that this vehicle has been repaired, rebuilt, or reconstructed and was formerly titled as a salvage motor vehicle.”</p>
      </>);
      case 'towAwayAcknowledgment': return <p className="key">The {car} leaves on a tow, on its salvage title, with no plates, and nothing is filed with the state.</p>;
      case 'buyerResponsibilityStatement': return <p>From today, anything the {car} needs is the buyer’s to handle. Salvage dealing is separately licensed (Tex. Occ. Code ch. 2302).</p>;
    }
  })();

  const accent = dealer.brand.accent;
  const docNo = `${{ billOfSale: 'BS', salvageBillOfSale: 'SB', conditionReport: 'CR' }[doc as string] ?? 'D'}-${date.slice(6)}${date.slice(0, 2)}${date.slice(3, 5)}-${(sale.vehicle.stock || sale.vehicle.vin.slice(-4)).replace(/\W/g, '')}`;
  return (
    <article className={'sheet' + (compact ? ' compact' : '')} style={{ ['--doc' as string]: accent }} lang={es ? 'es' : undefined}>
      <i className="band" />
      <Letterhead dealer={dealer} title={es ? 'Informe del estado del vehículo' : DOC_TITLE[doc]} no={docNo} date={date} stock={sale.vehicle.stock} es={es} />
      {body}
      {es && !dealer.spanishApproved && <p className="notice">Traducción pendiente de revisión legal · Translation pending counsel review</p>}
      {!compact && <footer className="sig">
        <div><span className="ink">{buyerSig && <img src={buyerSig} alt="Purchaser signature" />}</span><b>{es ? 'Comprador' : 'Purchaser'}</b><small>{b.fullName}</small><small className="d">{es ? 'Fecha' : 'Date'} {buyerSig ? signedOn : date}</small></div>
        <div><span className="ink">{dealerSig && dealer.signer.name && <em>{dealer.signer.name}</em>}</span><b>{es ? 'Vendedor, firma autorizada' : 'Seller, authorized signature'}</b><small>{dealer.signer.name ? `${dealer.signer.name}, ${dealer.signer.title}, ${es ? 'por' : 'for'} ${dealer.legalName}` : es ? `Representante autorizado de ${dealer.legalName}` : `Authorized representative, for ${dealer.legalName}`}</small><small className="d">{es ? 'Fecha' : 'Date'} {date}</small></div>
      </footer>}
      {!compact && <p className="foot"><span>{join(dealer.legalName, dealer.licence && `GDN ${dealer.licence}`)}</span><span>{docNo} · {es ? 'Página 1 de 1' : 'Page 1 of 1'}</span></p>}
    </article>
  );
}
