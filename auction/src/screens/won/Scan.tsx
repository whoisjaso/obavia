/* ID and insurance. Point the phone; the frame reads; the facts come back as
   centered lines; confirm each with a touch; "That's me". The licence's state
   decides whether the last step says Plates or Title. On native the camera
   (expo-camera) runs behind the frames and the shutter takes a real picture;
   the read (ML Kit / Vision) is a later phase, so the facts stay as they are.
   On web the frame stays dark. */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Label } from '../../components/Type';
import { Feather, Sky } from '../../components/Cloud';
import { feel } from '../../feel';
import { setSale, useSale } from '../../sale';
import { theme } from '../../theme';

const STATES = ['TX', 'OK', 'LA', 'NM'];

const NATIVE = Platform.OS !== 'web';

/* Native only: the camera and its permission. Asked when the frame mounts
   (the buyer has just chosen to scan), never at launch. Denied keeps the dark frame. */
function Lens({ camera }: { camera: React.RefObject<CameraView | null> }) {
  const [permission, request] = useCameraPermissions();
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && permission.status === 'undetermined') request().catch(() => {});
  }, [permission, request]);
  if (!permission?.granted) return null;
  return <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />;
}

function Frame({ kind, read, onShutter }: { kind: 'licence' | 'card'; read: boolean; onShutter: () => void }) {
  const camera = useRef<CameraView | null>(null);
  const [, setShot] = useState<string | null>(null);   // the picture's uri; held for the read, never persisted
  const press = async () => {
    if (NATIVE && camera.current) {
      try {
        const pic = await camera.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
        if (pic?.uri) setShot(pic.uri);
      } catch { /* no picture: the sequence still runs */ }
    }
    onShutter();
  };
  return (
    <View style={s.viewfinder}>
      {NATIVE && <Lens camera={camera} />}
      <Svg width="100%" height="100%" viewBox="0 0 320 420" preserveAspectRatio="xMidYMid meet">
        <Rect x={30} y={130} width={260} height={kind === 'licence' ? 164 : 150} rx={14} stroke={read ? theme.color.good : theme.color.cloud} strokeWidth={1.5} strokeOpacity={read ? 1 : 0.7} fill="rgba(255,255,255,0.04)" />
        {kind === 'licence' && <><Rect x={50} y={160} width={64} height={80} rx={8} fill="rgba(255,255,255,0.14)" /><Path d="M130 170h120M130 192h90M130 214h110M130 236h70" stroke="rgba(255,255,255,0.28)" strokeWidth={5} strokeLinecap="round" /></>}
        {kind === 'card' && <Path d="M50 160h150M50 190h220M50 215h180M50 250h120" stroke="rgba(255,255,255,0.28)" strokeWidth={5} strokeLinecap="round" />}
      </Svg>
      {!read && (
        <Pressable onPress={press} style={s.shutter} accessibilityRole="button" accessibilityLabel="Take the photo">
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
  const confirm = (k: string) => { setOk(o => ({ ...o, [k]: true })); feel.touch(); };
  const cycle = () => { const n = STATES[(STATES.indexOf(state) + 1) % STATES.length]; setState(n); setOk(o => ({ ...o, State: false })); feel.select(); };
  const thatsMe = () => { setSale({ id: { ...id, state, confirmed: true } }); feel.done(); onDone(); };
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, paddingTop: insets.top }]}>
      <Frame kind="licence" read={read} onShutter={shutter} />
      {read && (
        <Animated.View entering={FadeIn.duration(200)} style={[s.sheet, { paddingBottom: insets.bottom + theme.space.m }]}>
          <Feather />
          <Sky radius={28} low />
          <View style={s.facts}>
            {fields.map(([k, v], i) => (
              <Animated.View key={k} entering={FadeInDown.delay(i * 60).duration(180)}>
                <Pressable onPress={() => confirm(k)} onLongPress={k === 'State' ? cycle : undefined} style={s.fact} accessibilityRole="button" accessibilityLabel={`${k} ${v}`} accessibilityState={{ selected: !!ok[k] }}>
                  <Label>{k}</Label>
                  <Text style={[s.value, ok[k] && { color: theme.color.ink }]}>{v}</Text>
                  <View style={[s.mark, ok[k] && s.markOn]} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
          <Button label="That's me" onPress={thatsMe} disabled={!all} />
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, paddingTop: insets.top + theme.space.m }]}>
      <Label ink={theme.color.ice}>VIN</Label>
      <Text style={s.vin}>{vin}</Text>
      <Frame kind="card" read={read} onShutter={shutter} />
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
  value: { ...theme.type.sans, fontSize: 18, color: theme.color.muted, textAlign: 'center' },
  mark: { width: 18, height: 2, borderRadius: 1, backgroundColor: 'transparent', marginTop: 3 },
  markOn: { backgroundColor: theme.color.good },
  vin: { ...theme.type.sansBold, fontSize: 16, color: theme.color.cloud, letterSpacing: 1.5, textAlign: 'center', marginTop: 4 },
});
