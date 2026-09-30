/* One design for every document the dealer authors: the dealer's letterhead,
   hairline rules, figures in a tabular face, the one sentence that matters in
   red, the same signature grid. Official state forms (130-U, VTR-271) print
   from the official PDF; here they preview as the fields that will be filled. */
import { businessDate, type DealerConfig } from './lib/config';
import { DOC_TITLE } from './lib/documents';
import { computeMoney, parseMoney, usd } from './lib/money';
import { PER_YEAR, payment } from './lib/paperwork';
import { poaInstrument, type DocType } from './lib/plan';
import type { Sale } from './lib/sale';

export function saleReceipt(s: Sale, dealer: DealerConfig) {
  const bos = s.step.paperwork?.billOfSale ?? {};
  return computeMoney({ money: s.step.money, funding: s.step.funding?.type, tradeIn: parseMoney(bos.tradeAllowance) ?? 0, fees: dealer.fees });
}

export function Letterhead({ dealer, title, no }: { dealer: DealerConfig; title?: string; no?: string }) {
  return (
    <header className="lh">
      <span className="logo" style={{ background: dealer.brand.logo ? '#fff' : dealer.brand.accent }}>{dealer.brand.logo ? <img src={dealer.brand.logo} alt="" /> : dealer.brand.monogram}</span>
      <span className="who"><b>{dealer.dba || dealer.legalName}</b><small>{dealer.street}<br />{dealer.city}, {dealer.state} {dealer.zip}<br />{dealer.phone} · Licence {dealer.licence}</small></span>
      {title && <span className="doc"><b>{title}</b>{no && <small className="num">{no}</small>}</span>}
    </header>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <tr><td>{k}</td><td>{v}</td></tr>;

export function Sheet({ doc, sale, dealer, buyerSig, dealerSig, compact }: { doc: DocType; sale: Sale; dealer: DealerConfig; buyerSig?: string | null; dealerSig?: boolean; compact?: boolean }) {
  const v = sale.vehicle, b = sale.buyer, r = saleReceipt(sale, dealer);
  const p = sale.step.paperwork?.[doc] ?? {}, bos = sale.step.paperwork?.billOfSale ?? {};
  const car = `${v.year} ${v.make} ${v.model}`;
  const date = businessDate(dealer.timeZone);
  const funding = sale.step.funding;
  const lender = funding?.type === 'lender' ? funding.lenderOther || funding.lenderId : null;
  const lien = funding?.type === 'lender' ? lender : r.balance > 0 || funding?.type === 'inHouse' ? dealer.legalName : null;
  const odo = bos.mileage === 'exceeds' ? 'exceeds mechanical limits' : bos.mileage === 'notActual' ? 'not the actual mileage' : 'the actual mileage';

  const body = (() => {
    switch (doc) {
      case 'billOfSale': case 'salvageBillOfSale': return (<>
        <section className="parties">
          <div><h4>Seller</h4><b>{dealer.legalName}</b><span>{dealer.street}, {dealer.city}, {dealer.state} {dealer.zip}</span><span>Dealer licence {dealer.licence}</span></div>
          <div><h4>Buyer</h4><b>{b.fullName}</b><span>{b.address}, {b.city}, {b.state} {b.zip}</span><span>{b.phone}</span></div>
        </section>
        <section className="vehicle">
          <h4>Vehicle</h4>
          <div className="cells">
            <div className="wide"><small>Year, make, model</small><b>{car}</b></div>
            <div><small>Body</small><b>{v.bodyStyle}</b></div>
            <div className="wide"><small>VIN</small><b className="mono">{v.vin}</b></div>
            <div><small>Odometer</small><b className="num">{v.mileage?.toLocaleString() ?? '—'} mi</b></div>
          </div>
          <p className="fine">The seller states the odometer reading is {odo}.{doc === 'salvageBillOfSale' ? ' This vehicle carries a salvage title.' : sale.vehicle.titleStatus === 'rebuilt_salvage' ? ' This vehicle carries a rebuilt salvage title.' : ''}</p>
        </section>
        <section className="money">
          <h4>Price</h4>
          <table className="num"><tbody>
            <Row k="Sale price" v={usd(r.salePrice)} /><Row k={`Sales tax (${(dealer.fees.taxRate * 100).toFixed(2)}%)`} v={usd(r.tax)} /><Row k="Title fee" v={usd(r.title)} />
            <Row k="Registration fee" v={usd(r.registration)} /><Row k="Documentary fee" v={usd(r.doc)} />
            {r.tradeIn > 0 && <Row k={`Trade-in${bos.tradeDesc ? `: ${bos.tradeDesc}` : ''}`} v={`−${usd(r.tradeIn)}`} />}
          </tbody><tfoot>
            <tr className="total"><td>Total</td><td style={{ color: dealer.brand.accent }}>{usd(r.total)}</td></tr>
            <Row k={`Paid today · ${funding?.type === 'cash' ? bos.payMethod ?? 'Cash' : 'Financing'}${lender ? `, ${lender}` : ''}`} v={usd(r.paidToday)} />
            <tr className={r.balance > 0 ? 'owed' : ''}><td>Balance</td><td>{usd(r.balance)}</td></tr>
          </tfoot></table>
          {r.balance > 0 && <p className="key">Balance owed by the buyer to the seller under this bill of sale: {usd(r.balance)}, secured by a lien in favor of {dealer.legalName}.</p>}
        </section>
        <section className="terms">
          <h4>Terms</h4>
          <p>{bos.asIs === 'warranty' ? `Sold with a warranty: ${bos.warrantyLength ?? ''}, as stated on the Buyer’s Guide.` : 'Sold as is, with no warranty, as stated on the Buyer’s Guide, which is part of this sale.'} </p>
          {/* Texas doc-fee notice (43 TAC §215.155). Wording to be confirmed with counsel before the first live sale. */}
          <p className="notice">A documentary fee is not an official fee. A documentary fee is not required by law, but may be charged to buyers for handling documents relating to the sale. A documentary fee may not exceed a reasonable amount agreed to by the parties. This notice is required by law.</p>
          <p>The seller transfers the vehicle above to the buyer for the price stated, and the buyer accepts it.</p>
        </section>
      </>);
      case 'form130U': return (<>
        <p className="official">Printed on the official TxDMV Form 130-U. These are the fields that will be filled.</p>
        <table><tbody>
          <Row k="Applicant" v={`${b.fullName}${p.buyerKind === 'business' ? ' (business)' : ''}`} /><Row k="Address" v={`${b.address}, ${b.city}, ${b.state} ${b.zip}`} />
          <Row k="County" v={p.county || b.county} /><Row k="ID" v={`${{ dl: 'Driver licence', stateId: 'State ID', passport: 'Passport', military: 'Military ID' }[b.idType]} ${b.idNumber}`} />
          <Row k="Vehicle" v={`${car} · ${v.bodyStyle}`} /><Row k="VIN" v={v.vin} /><Row k="Odometer" v={`${v.mileage?.toLocaleString() ?? ''}`} />
          <Row k="Empty weight" v={p.emptyWeight ? `${Number(p.emptyWeight).toLocaleString()} lb` : ''} />{p.capacity && <Row k="Carrying capacity" v={p.capacity} />}
          <Row k="Applying for" v={{ both: 'Title and registration', title: 'Title only', registration: 'Registration only' }[p.applyingFor as string] ?? ''} />
          <Row k="Sales price" v={usd(r.salePrice)} /><Row k="First lienholder" v={lien ?? 'None'} />
        </tbody></table>
      </>);
      case 'financing': {
        const down = parseMoney(p.down) ?? 0, principal = Math.max(0, r.total - down), per = PER_YEAR[p.frequency] ?? 12;
        const pay = payment(principal, Number(p.rate) || 0, Number(p.count) || 0, per);
        return (<>
          <table className="num"><tbody>
            <Row k="Cash price, tax and fees" v={usd(r.total)} /><Row k="Down payment" v={usd(down)} /><Row k="Amount financed" v={usd(principal)} />
            <Row k="Rate (APR)" v={`${p.rate ?? ''}%`} /><Row k="Payments" v={`${p.count ?? ''} × ${usd(pay)}, ${{ weekly: 'weekly', biweekly: 'every two weeks', monthly: 'monthly' }[p.frequency as string] ?? ''}`} />
            <Row k="First payment due" v={p.firstDue ?? ''} />
          </tbody></table>
          <p className="key">The rate is held to the Texas Finance Code ceiling the owner confirms before the first sale.</p>
        </>);
      }
      case 'vehicleResponsibility': return (<>
        <p>The buyer is filing the title and registration for the {car} (VIN {v.vin}) and will do so within 30 days of {date}.</p>
        <p className="key">If the filing comes back to the dealer, the buyer owes {usd(r.registrationCost)} for tax and fees.</p>
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
        <p>The buyer was given the chance to inspect the {car}, VIN {v.vin}, before signing anything else. The state’s disclosure sentence prints here word for word from Form ENF-MV-RBLT DSCLMR.</p>
      </>);
      case 'towAwayAcknowledgment': return <p className="key">The {car} leaves on a tow, on its salvage title, with no plates, and nothing is filed with the state.</p>;
      case 'buyerResponsibilityStatement': return <p>From today, anything the {car} needs is the buyer’s to handle. Salvage dealing is separately licensed (Tex. Occ. Code ch. 2302).</p>;
    }
  })();

  const accent = dealer.brand.accent;
  return (
    <article className={'sheet' + (compact ? ' compact' : '')} style={{ ['--doc' as string]: accent }}>
      <i className="band" />
      <Letterhead dealer={dealer} title={DOC_TITLE[doc]} no={`${date}${sale.vehicle.stock ? ` · Stock ${sale.vehicle.stock}` : ''}`} />
      {body}
      {!compact && <footer className="sig">
        <div><span className="ink">{buyerSig && <img src={buyerSig} alt="Buyer signature" />}</span><b>Buyer</b><small>{b.fullName} · {date}</small></div>
        <div><span className="ink">{dealerSig && <em>{dealer.signer.name}</em>}</span><b>Seller</b><small>{dealer.signer.name}, {dealer.signer.title} · {date}</small></div>
      </footer>}
    </article>
  );
}
