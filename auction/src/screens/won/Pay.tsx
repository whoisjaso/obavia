/* Pay the balance. One number, one date, three ways: ACH with its clearing
   day, Wire today, Cash at the lot. The words are the choices. The date is
   the server's pay-by (the lot's sale.deadlineAt, synced by the Lane), in
   Bodoni, in the buyer's own time zone, the same words the push says after
   "Pay by" (DOCTRINE CP9). Until the server's date arrives the line waits.
   The clock touches the date (lego §4.1; DOCTRINE §5: "the clock and ring
   (the close, the pay deadline)"): its arc sweeps once from twelve to its
   mark as the deadline lands on the glass (400 ms, the moment player) and
   rests there. Reduced motion: the resting clock, no sweep. No sound: the
   tap on a word is the page's feel, and that stays as it was.
   The balance invoice (W3-A, on Whop; the lot's sale.invoiceUrl, synced by the Lane): once the sale carries it,
   Bank and Wire say "invoice" in their detail and the tap opens it in the in-app browser, Whop's page, not
   ours; Cash stays the lot's. Without one (the Worker has not made it, or the local stand-in, which has no
   Whop) the word records the choice as before. A URL that is not https is never opened. */
import React, { useEffect, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Moment, useMoment } from '../../components/Moment';
import { MOMENT_3D } from '../../components/scene3d';
import { Choice, Hairline, Label, Page, Serif } from '../../components/Type';
import { dollars } from '../../engine/money';
import { cloud, ms } from '../../motion';
import { payByWords, payDeadline, setSale, useSale } from '../../sale';
import { DEPOSIT } from '../../store';
import { theme } from '../../theme';

/** The light set, the one Pay draws on the sky; null when no render ships. */
export const CLOCK = MOMENT_3D.clock?.light ?? null;
/** The clock's cell beside a 34 pt date: the ring fills its middle 74 percent, so it stands a hair taller than the
    numerals, the way the key stands beside the six on the pass. */
const CLOCK_H = 60;
/** The page settles child by child (Type.tsx, Settle): the pay-by block is the third, so it is most of the way in
    at two staggers and half the settle (about 85 percent opaque on the house out-curve). The sweep begins there,
    on a date the eye can already read, not under a block still fading in. */
const SETTLE_LEAD = 2 * cloud.stagger + ms.page / 2;

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function achClears(from: number) {
  const d = new Date(from); let n = 0;
  while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }   // three business days
  return DAY[d.getDay()];
}

export function Pay({ onDone }: { onDone: () => void }) {
  const sale = useSale();
  const reduce = useReducedMotion();
  const { f, onReady, begin } = useMoment(CLOCK, reduce);
  const due = sale ? payDeadline(sale) : null;
  const by = due === null ? null : payByWords(due);
  // the deadline lands (on mount when it is already known, after the block has settled in; the moment the
  // server's date arrives otherwise): one sweep. Reduced motion: the still, at once.
  const mounted = useRef(Date.now());
  useEffect(() => {
    if (by === null) return;
    const lead = reduce ? 0 : Math.max(0, SETTLE_LEAD - (Date.now() - mounted.current));
    let stop: (() => void) | undefined;
    const t = setTimeout(() => { stop = begin(); }, lead);
    return () => { clearTimeout(t); stop?.(); };
  }, [by !== null]);
  if (!sale) return null;
  const invoice = sale.invoiceUrl && /^https:\/\//.test(sale.invoiceUrl) ? sale.invoiceUrl : null;
  const pick = (k: 'ach' | 'wire' | 'cash') => {
    setSale({ pay: k });
    if (k !== 'cash' && invoice) void WebBrowser.openBrowserAsync(invoice).catch(() => {});   // Whop's page; a refusal is silent
    setTimeout(onDone, 260);
  };
  const onInvoice = !!sale.invoiceUrl;
  return (
    <Page>
      <Label>Balance</Label>
      <Serif size={theme.size.display + 12}>${dollars(sale.total - DEPOSIT)}</Serif>
      {by && (
        <View accessible accessibilityLabel={`Pay by ${by}`} style={{ marginTop: theme.space.m, alignItems: 'center' }}>
          <Label>Pay by</Label>
          {/* the clock touching the date it measures; a spacer half its width on the other side keeps the date centred */}
          <View style={s.byRow}>
            <Moment m={CLOCK} f={f} height={CLOCK_H} onReady={onReady} style={s.clock} testID="clock-sheet" />
            <Serif size={34}>{by}</Serif>
            <View style={{ width: CLOCK_H * 0.5 }} />
          </View>
        </View>
      )}
      <Hairline style={{ marginVertical: theme.space.l }} />
      <View>
        <Choice label="Bank" detail={`${onInvoice ? 'invoice' : 'transfer'}, clears ${achClears(sale.wonAt)}`} accessibilityLabel={`Bank ${onInvoice ? 'invoice' : 'transfer'}, clears ${achClears(sale.wonAt)}`} selected={sale.pay === 'ach'} onPress={() => pick('ach')} />
        <Choice label="Wire" detail={onInvoice ? 'invoice, today' : 'today'} accessibilityLabel={onInvoice ? 'Wire invoice, today' : 'Wire, today'} selected={sale.pay === 'wire'} onPress={() => pick('wire')} />
        <Choice label="Cash" detail="at the lot" selected={sale.pay === 'cash'} onPress={() => pick('cash')} />
      </View>
    </Page>
  );
}

const s = StyleSheet.create({
  byRow: { flexDirection: 'row', alignItems: 'center' },
  clock: { marginRight: -4 },   // the cell's transparent edge (13 percent) overlaps the gap, so the ring touches the date
});
