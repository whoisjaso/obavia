/* ID and insurance. Point the phone; the silhouette tilts; five chips appear;
   confirm each (light impact); "That's me" (ding). The licence's state decides
   whether the last tile says Plates or Title. The camera itself (expo-camera)
   and the read (ML Kit / Vision) are the next wiring; the frames are the same. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../../feel';
import { setSale, useSale } from '../../sale';
import { theme } from '../../theme';

const STATES = ['TX', 'OK', 'LA', 'NM'];

function Frame({ kind, read, onShutter }: { kind: 'licence' | 'card'; read: boolean; onShutter: () => void }) {
  return (
    <View style={s.viewfinder}>
      <Svg width="100%" height="100%" viewBox="0 0 320 420" preserveAspectRatio="xMidYMid meet">
        <Rect x={30} y={130} width={260} height={kind === 'licence' ? 164 : 150} rx={14} stroke={read ? theme.color.good : theme.color.cloud} strokeWidth={2.5} strokeDasharray={read ? undefined : '10 8'} fill="rgba(255,255,255,0.06)" />
        {kind === 'licence' && <><Rect x={50} y={160} width={64} height={80} rx={8} fill="rgba(255,255,255,0.18)" /><Path d="M130 170h120M130 192h90M130 214h110M130 236h70" stroke="rgba(255,255,255,0.35)" strokeWidth={6} strokeLinecap="round" /></>}
        {kind === 'card' && <Path d="M50 160h150M50 190h220M50 215h180M50 250h120" stroke="rgba(255,255,255,0.35)" strokeWidth={6} strokeLinecap="round" />}
      </Svg>
      {!read && (
        <Pressable onPress={onShutter} style={s.shutter} accessibilityRole="button" accessibilityLabel="Take the photo">
          <View style={s.shutterInner} />
        </Pressable>
      )}
    </View>
  );
}

export function IdScan({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const sale = useSale();
  const [read, setRead] = useState(!!sale?.id);
  const [ok, setOk] = useState<Record<string, boolean>>({});
  const [state, setState] = useState(sale?.id?.state ?? 'TX');
  const id = sale?.id ?? { name: 'Marisol Treviño', dob: '04/12/1991', address: '2210 Example Ave, San Antonio', licence: '•••• 4821', state, confirmed: false };
  const fields: [string, string][] = [['Name', id.name], ['Born', id.dob], ['Address', id.address], ['Licence', id.licence], ['State', state]];
  const all = fields.every(([k]) => ok[k]);
  const shutter = () => { feel.touch(); setTimeout(() => { setRead(true); feel.select(); setSale({ id: { ...id, state, confirmed: false } }); }, 500); };
  const confirm = (k: string) => {
    if (k === 'State' && !ok[k]) { /* tap once to confirm; the chip cycles on long-press in the demo */ }
    setOk(o => ({ ...o, [k]: true })); feel.touch();
  };
  const cycle = () => { const n = STATES[(STATES.indexOf(state) + 1) % STATES.length]; setState(n); setOk(o => ({ ...o, State: false })); feel.select(); };
  const thatsMe = () => { setSale({ id: { ...id, state, confirmed: true } }); feel.done(); onDone(); };
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, paddingTop: insets.top }]}>
      <Frame kind="licence" read={read} onShutter={shutter} />
      {read && (
        <Animated.View entering={FadeIn.duration(200)} style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.chips}>
            {fields.map(([k, v], i) => (
              <Animated.View key={k} entering={FadeInDown.delay(i * 60).duration(180)}>
                <Pressable onPress={() => confirm(k)} onLongPress={k === 'State' ? cycle : undefined} style={[s.chip, ok[k] && s.chipOk]} accessibilityRole="button" accessibilityLabel={`${k} ${v}`} accessibilityState={{ selected: !!ok[k] }}>
                  <Text style={s.chipKey}>{k}</Text><Text style={s.chipVal}>{v}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
          <Pressable disabled={!all} onPress={thatsMe} style={[s.btn, !all && s.btnOff]} accessibilityRole="button"><Text style={s.btnText}>That's me</Text></Pressable>
        </Animated.View>
      )}
    </View>
  );
}

export function InsureScan({ vin, onDone }: { vin: string; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [read, setRead] = useState(false);
  const shutter = () => { feel.touch(); setTimeout(() => { setRead(true); setSale({ insured: true }); feel.done(); setTimeout(onDone, 700); }, 500); };
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, paddingTop: insets.top }]}>
      <View style={s.vinRow}><Text style={s.vinKey}>VIN</Text><Text style={s.vin}>{vin}</Text></View>
      <Frame kind="card" read={read} onShutter={shutter} />
    </View>
  );
}

const s = StyleSheet.create({
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shutter: { position: 'absolute', bottom: 40, width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: theme.color.cloud, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.color.cloud },
  sheet: { backgroundColor: theme.color.sky, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 44, borderRadius: 22, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, justifyContent: 'center' },
  chipOk: { borderColor: theme.color.good, backgroundColor: theme.color.good + '14' },
  chipKey: { fontFamily: theme.font.sans, fontSize: 10, color: theme.color.muted },
  chipVal: { fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink },
  btn: { height: 52, borderRadius: 26, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.4 },
  btnText: { fontFamily: theme.font.sansBold, fontSize: 17, color: theme.color.cloud },
  vinRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingHorizontal: 22, paddingTop: 16 },
  vinKey: { fontFamily: theme.font.sans, fontSize: 12, color: theme.color.ice },
  vin: { fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.cloud, letterSpacing: 1 },
});
