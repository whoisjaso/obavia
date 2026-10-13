/* ID and insurance. Point the phone; the frame reads; the facts come back as
   centered lines in ink; "That's me" confirms all five at once and is live the
   moment they arrive. Tapping a fact corrects it: State opens a wheel, the
   others open the field in place; a correction lands with the light impact and
   a green rule under the fact it changed. A name reads as a name, a date as a
   date, a street as a street, so those three carry no label (simplicity-audit
   change 17, October 13, 2026); LICENSE and STATE keep theirs over their values.
   The ID runs twice in a buyer's life: before the first bid (BidSheet, then
   the deposit) and as the first step after a win, prefilled from the first. The licence's state
   decides whether the last step says Plates or Title. On native the camera
   (expo-camera) runs behind the frames and the shutter takes a real picture;
   the read (ML Kit / Vision) is a later phase, so the facts stay as they are.
   On web the frame stays dark. */
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Label } from '../../components/Type';
import { Feather } from '../../components/Cloud';
import { Object3D } from '../../components/Object3D';
import { Sky } from '../../components/Sky';
import { feel } from '../../feel';
import { WORKER, setSale, type Licence } from '../../sale';
import { isAdult, isExpired, isTexas, parseAamva, toSale, type LicenceRead } from '../../licence';
import { Wheel } from '../../components/Wheel';
import { saveProfile } from '../../store';
import { theme } from '../../theme';

/* The local fixture server's licence (no Worker, sale.ts WORKER): the shutter shows these facts. With a Worker the
   facts come only from the back of the card (licence.ts, the PDF417 read) and this never shows. */
const FIXTURE = { name: 'Marisol Treviño', dob: '04/12/1991', address: '2210 Example Ave, San Antonio', licence: '•••• 4821' };

const NATIVE = Platform.OS !== 'web';

/* Native only: the camera and its permission. Asked when the frame mounts
   (the buyer has just chosen to scan), never at launch. Denied keeps the dark frame. */
/* `onScan`: the PDF417 on the back of a licence, read by the camera; undefined once read, so one shot fires once. */
function Lens({ camera, onScan }: { camera: React.RefObject<CameraView | null>; onScan?: (data: string) => void }) {
  const [permission, request] = useCameraPermissions();
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && permission.status === 'undetermined') request().catch(() => {});
  }, [permission, request]);
  if (!permission?.granted) return null;
  return <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back"
    barcodeScannerSettings={onScan ? { barcodeTypes: ['pdf417'] } : undefined}
    onBarcodeScanned={onScan ? ({ data }) => onScan(data) : undefined} />;
}

/* The outline's rect in the frame's own 320 by 420 units, and where the SVG (xMidYMid meet) puts it on the glass:
   the rendered object (the insurance card, D7) sits in that rect, the slot the shutter fills. */
const VB = { w: 320, h: 420, x: 30, y: 130, w2: 260 };
const rectOnGlass = (W: number, H: number, h2: number) => {
  const sc = Math.min(W / VB.w, H / VB.h), ox = (W - VB.w * sc) / 2, oy = (H - VB.h * sc) / 2;
  return { left: ox + VB.x * sc, top: oy + VB.y * sc, width: VB.w2 * sc, height: h2 * sc };
};

/** The frame. `onScan`: the barcode read is live (the shutter steps aside and the outline is the card's back, the
    barcode band, which is the side to point at). `stamp`: a refused read's four words, where the shutter was.
    `object`: the rendered thing that belongs in the outline (the card), in place of drawn lines. */
function Frame({ kind, read, onShutter, onScan, stamp, object }: { kind: 'licence' | 'card'; read: boolean; onShutter: () => void; onScan?: (data: string) => void; stamp?: string | null; object?: React.ReactNode }) {
  const camera = useRef<CameraView | null>(null);
  const [, setShot] = useState<string | null>(null);   // the picture's uri; held for the read, never persisted
  const [box, setBox] = useState({ w: 0, h: 0 });
  const press = async () => {
    if (NATIVE && camera.current) {
      try {
        const pic = await camera.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
        if (pic?.uri) setShot(pic.uri);
      } catch { /* no picture: the sequence still runs */ }
    }
    onShutter();
  };
  const rectH = kind === 'licence' ? 164 : 150;
  const slot = object && box.w > 0 ? rectOnGlass(box.w, box.h, rectH) : null;
  return (
    <View style={s.viewfinder} onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {NATIVE && <Lens camera={camera} onScan={read ? undefined : onScan} />}
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid meet">
        <Rect x={VB.x} y={VB.y} width={VB.w2} height={rectH} rx={14} stroke={read ? theme.color.good : theme.color.cloud} strokeWidth={1.5} strokeOpacity={read ? 1 : 0.7} fill="rgba(255,255,255,0.04)" />
        {kind === 'licence' && onScan && <Rect x={50} y={190} width={220} height={60} rx={4} fill="rgba(255,255,255,0.22)" />}
        {kind === 'licence' && !onScan && <><Rect x={50} y={160} width={64} height={80} rx={8} fill="rgba(255,255,255,0.14)" /><Path d="M130 170h120M130 192h90M130 214h110M130 236h70" stroke="rgba(255,255,255,0.28)" strokeWidth={5} strokeLinecap="round" /></>}
        {kind === 'card' && !object && <Path d="M50 160h150M50 190h220M50 215h180M50 250h120" stroke="rgba(255,255,255,0.28)" strokeWidth={5} strokeLinecap="round" />}
      </Svg>
      {slot && <View pointerEvents="none" style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, slot]}>{object}</View>}
      {!read && !!stamp && <Text style={s.stamp} accessibilityLiveRegion="polite">{stamp}</Text>}
      {!read && !onScan && (
        <Pressable onPress={press} style={s.shutter} accessibilityRole="button" accessibilityLabel="Take the photo">
          <View style={s.shutterInner} />
        </Pressable>
      )}
    </View>
  );
}

/* Every US licence, in the order a wheel lists them. Texas buyers only at launch (decisions §3.1, row 5), but
   the read can come back with any state, and a non-Texas one turns the last step into Title. */
const STATES = ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'];

type Fact = 'Name' | 'Born' | 'Address' | 'License' | 'State';
const KEYS: Exclude<Fact, 'State'>[] = ['Name', 'Born', 'Address', 'License'];
/* The facts that carry a label over their value; the other three are what they look like. */
const LABELLED: Fact[] = ['License', 'State'];
/* The keyboard each field opens with. The licence number is masked back to its last four as it lands: the
   phone keeps no more of it than the read showed. */
const KEYBOARD: Record<Exclude<Fact, 'State'>, 'default' | 'numbers-and-punctuation' | 'number-pad'> = { Name: 'default', Born: 'numbers-and-punctuation', Address: 'default', License: 'number-pad' };
/* On the web the browser's focus box would sit around the field; the accent rule under it is the focus. */
const WEB_FIELD = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;
/* The State fact is the issuer's: Texas by the card's IIN (isTexas), which decides Plates or Title (sale.ts
   outOfState). A card another state issued to a Texas address must not read TX: it shows as out of state. */
const issuer = (r: LicenceRead) => (isTexas(r) ? 'TX' : r.state && r.state !== 'TX' ? r.state : 'Out of state');
const masked = (v: string) => { const d = v.replace(/\D/g, ''); return d.length >= 4 ? `•••• ${d.slice(-4)}` : v; };

/** The licence: frame, shutter, five facts, "That's me". `initial`: a licence already read (the first bid's,
    or the sale's). "That's me" is never disabled: it confirms the five as they stand. A tap on a fact opens it
    to correct (State: the wheel; the rest: the field, in place). `onCancel`: the first bid's way back. */
export function IdScan({ initial, onDone, onCancel }: { initial?: Licence; onDone: (id: Licence) => void; onCancel?: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [read, setRead] = useState(!!initial);
  const pre = !!initial?.confirmed;
  // with a Worker the facts wait for the card's own read; the fixture is the local fixture server's alone
  const first: Licence = initial ?? (WORKER ? { name: '', dob: '', address: '', licence: '', state: 'TX', confirmed: false } : { ...FIXTURE, state: 'TX', confirmed: false });
  const [facts, setFacts] = useState<Record<Exclude<Fact, 'State'>, string>>({ Name: first.name, Born: first.dob, Address: first.address, License: first.licence });
  const [state, setState] = useState(first.state);
  const [fixed, setFixed] = useState<Partial<Record<Fact, boolean>>>({});   // the facts the buyer corrected
  const [open, setOpen] = useState<Fact | null>(null);                       // the one fact open for correction
  const [draft, setDraft] = useState('');
  const wheelFrom = useRef(state);                                           // State when the wheel opened
  const shutter = () => { feel.touch(); setTimeout(() => { setRead(true); feel.select(); }, 500); };
  const [stamp, setStamp] = useState<string | null>(null);   // a refused read, in four words or fewer
  const scanning = NATIVE && WORKER && !read;
  /** The back of the card, read: the five facts and the State, or a refusal that only stamps (no sound, no touch). */
  const onScan = (data: string) => {
    if (live.current.read) return;
    const r = parseAamva(data);
    if (!r) return;                                                // not a licence: keep looking, silently
    const now = Date.now();
    if (isExpired(r, now)) { setStamp('That license has expired'); return; }
    if (!isAdult(r, now)) { setStamp('Must be eighteen'); return; }
    live.current.read = true;
    const l = toSale(r);
    live.current.facts = { Name: l.name, Born: l.dob, Address: l.address, License: l.licence };
    live.current.state = issuer(r);
    setFacts(live.current.facts); setState(live.current.state); setStamp(null); setRead(true); feel.select();
  };

  /* The latest values, for handlers that run in the same tick as the field's blur (a tap on That's me or on
     another fact blurs the field first; the closure that follows still holds the values of the render before). */
  const live = useRef({ open: null as Fact | null, facts, state, draft, read });
  live.current.draft = draft;
  /** Close the open fact; a correction lands with the light impact and its green rule. Twice is once. */
  const close = () => {
    const L = live.current, k = L.open;
    if (!k) return;
    L.open = null; setOpen(null);
    let changed = false;
    if (k === 'State') changed = L.state !== wheelFrom.current;
    else {
      const typed = L.draft.trim(), v = k === 'License' ? masked(typed) : typed;
      if (v && v !== L.facts[k]) { L.facts = { ...L.facts, [k]: v }; setFacts(L.facts); changed = true; }
    }
    if (changed) { setFixed(f => ({ ...f, [k]: true })); feel.touch(); }
  };
  const tap = (k: Fact) => {
    const was = live.current.open;
    close();
    if (was === k) return;
    if (k === 'State') { wheelFrom.current = live.current.state; feel.select(); }
    else setDraft(k === 'License' ? '' : live.current.facts[k]);
    live.current.open = k; setOpen(k);
  };
  const turn = (v: string) => { live.current.state = v; setState(v); };
  const pickState = (v: string) => { turn(v); close(); };
  const thatsMe = () => {
    close();
    const { facts: f, state: st } = live.current;
    const done: Licence = { name: f.Name, dob: f.Born, address: f.Address, licence: f.License, state: st, confirmed: true };
    // the name (for the paperwork, the Desk and the top of Me) and the street line as the Worker compares it (D11):
    // the card's read or the buyer's own correction, in one save; never the fixture's
    const real = (v: string, fixture: string) => !!v && (WORKER || v !== fixture);
    const give = { ...(real(done.name, FIXTURE.name) ? { name: done.name } : {}), ...(real(done.address, FIXTURE.address) ? { address: done.address.split(',')[0] } : {}) };
    if (give.name || give.address) saveProfile(give);
    feel.step(); onDone(done);
  };
  const rows: [Fact, string][] = [...KEYS.map(k => [k, facts[k]] as [Fact, string]), ['State', state]];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, paddingTop: insets.top }]}>
      <Frame kind="licence" read={read} onShutter={shutter} onScan={scanning ? onScan : undefined} stamp={stamp} />
      {onCancel && !read && (
        <Pressable onPress={onCancel} hitSlop={12} style={[s.later, { top: insets.top + theme.space.s }]} accessibilityRole="button">
          <Text style={s.laterText}>Not now</Text>
        </Pressable>
      )}
      {read && (
        <Animated.View entering={FadeIn.duration(200)} style={[s.sheet, { paddingBottom: insets.bottom + theme.space.m }]}>
          <Feather />
          <Sky radius={28} low />
          <View style={s.facts}>
            {rows.map(([k, v], i) => (
              <Animated.View key={k} entering={pre ? undefined : FadeInDown.delay(i * 60).duration(180)} style={{ alignSelf: 'stretch', alignItems: 'center' }}>
                {open === k && k !== 'State' ? (
                  <View style={s.fact}>
                    {LABELLED.includes(k) && <Label>{k}</Label>}
                    <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={close} onBlur={close}
                      autoFocus selectTextOnFocus returnKeyType="done" keyboardType={KEYBOARD[k]} placeholder={k === 'License' ? v : undefined}
                      placeholderTextColor={theme.color.faint} autoCapitalize={k === 'Name' || k === 'Address' ? 'words' : 'none'} autoCorrect={false}
                      accessibilityLabel={k} style={[s.value, s.field, WEB_FIELD, { width: width - theme.space.m * 4 }]} />
                    <View style={[s.mark, s.markOpen]} />
                  </View>
                ) : (
                  <Pressable onPress={() => tap(k)} style={s.fact} accessibilityRole="button" accessibilityLabel={`${k} ${v}`} accessibilityHint="Opens it to correct"
                    accessibilityState={{ expanded: open === k }}>
                    {LABELLED.includes(k) && <Label>{k}</Label>}
                    {!(k === 'State' && open === 'State') && <Text style={s.value}>{v}</Text>}
                    {!(k === 'State' && open === 'State') && <View style={[s.mark, fixed[k] && s.markOn]} />}
                  </Pressable>
                )}
                {k === 'State' && open === 'State' && (
                  <Wheel items={STATES} value={state} width={width - theme.space.m * 2} onChange={turn} onPick={pickState} label="State" />
                )}
              </Animated.View>
            ))}
          </View>
          <Button label="That's me" onPress={thatsMe} />
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Insure. The rendered insurance card sits in the frame as the slot (DOCTRINE §5; legibility-audit D7): the
    object says what to point at, no words. The VIN belongs to the agent on the phone, not to the lot: one faint
    word under the shutter opens it (simplicity-audit change 18, October 13, 2026). */
export function InsureScan({ vin, onDone }: { vin: string; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [read, setRead] = useState(false);
  const [vinOpen, setVinOpen] = useState(false);
  const shutter = () => { feel.touch(); setTimeout(() => { setRead(true); setSale({ insured: true }); feel.step(); setTimeout(onDone, 700); }, 500); };
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, paddingTop: insets.top + theme.space.m }]}>
      {/* the card object in the outline it belongs to (lego §4.1): the slot says what to point at */}
      <Frame kind="card" read={read} onShutter={shutter} object={<Object3D name="insurance" width={212} strength={read ? 1 : 0.6} />} />
      <Pressable onPress={() => { feel.select(); setVinOpen(v => !v); }} hitSlop={12} style={[s.vinRow, { paddingBottom: insets.bottom + theme.space.s }]}
        accessibilityRole="button" accessibilityLabel={vinOpen ? `VIN ${vin}` : 'VIN'} accessibilityState={{ expanded: vinOpen }}>
        <Text style={s.vinWord}>VIN</Text>
        {vinOpen && <Text style={s.vin}>{vin}</Text>}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shutter: { position: 'absolute', bottom: 40, width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: theme.color.cloud, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.color.cloud },
  sheet: { backgroundColor: theme.color.sky, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: theme.space.m, paddingTop: theme.space.l, gap: theme.space.l },
  facts: { alignItems: 'center', gap: theme.space.s },
  fact: { alignItems: 'center', gap: 3 },
  value: { ...theme.type.sans, fontSize: 18, color: theme.color.ink, textAlign: 'center' },
  field: { paddingVertical: 0, minHeight: 24 },
  mark: { width: 18, height: 2, borderRadius: 1, backgroundColor: 'transparent', marginTop: 3 },
  markOn: { backgroundColor: theme.color.good },
  markOpen: { backgroundColor: theme.color.accent },
  later: { position: 'absolute', left: theme.space.m },
  stamp: { ...theme.type.sansBold, position: 'absolute', bottom: 64, left: theme.space.m, right: theme.space.m, fontSize: 17, color: theme.color.cloud, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  laterText: { ...theme.type.sans, fontSize: 17, color: theme.color.cloud, opacity: 0.8 },
  vinRow: { alignItems: 'center', paddingTop: theme.space.s, gap: 4 },
  vinWord: { ...theme.type.sans, fontSize: 17, color: theme.color.cloud, opacity: 0.6, letterSpacing: 1.5 },
  vin: { ...theme.type.sansBold, fontSize: 17, color: theme.color.cloud, letterSpacing: 1.5, textAlign: 'center' },
});
