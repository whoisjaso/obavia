/* Sign-in by phone: the first of the three Phase 2 pages (obavia-auction-phases.md, Onboarding (buyer)), and
   the first link of the first-bid chain: Bid, Phone, ID, Pay. Two pages, one thing each.
     Your number   the question, the number under it with the platform's phone keyboard, one cloud verb:
                   "Text me a code". The cloud is faint until ten digits make a US number.
     The code      the number it went to (a tap goes back to change it), and six boxes under it. The keyboard is the action: the boxes fill
                   and the sixth digit checks itself. "Send it again" comes back, faint, after 30 s.
   Silence on the negative paths: a wrong code clears the boxes and the stamp says "Not that code", nothing
   else. The body says it worked: the Light impact on the send; on the proof the Success haptic and the air
   swell (feel.held, cloud-landed) on the frame the six turn green and breathe once. Reduced motion: no
   transforms, the colours still land. The number and the code are never logged. */
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudButton } from '../../components/CloudButton';
import { Feather } from '../../components/Cloud';
import { Sky } from '../../components/Sky';
import { Label } from '../../components/Type';
import { feel } from '../../feel';
import { BREATH, CLOUD_OUT, EASE_OUT, cloud, ms } from '../../motion';
import { formatUS, usDigits, validUS } from '../../engine/phone';
import { sendPhoneCode, verifyPhoneCode } from '../../store';
import { theme } from '../../theme';

const RESEND_MS = 30_000;   // the Worker's gap between sends (worker/src/phone.ts CODE_GAP_MS)
const BOX_W = 46, BOX_H = 60, BOX_GAP = 8;
/* On the web the browser's focus box would sit around the field; the accent rule under it is the focus. */
const WEB_FIELD = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** The Worker's refusal as the stamp says it, four words at most; null keeps the glass silent. */
function stampFor(code: string, retryAfter?: number): string {
  if (code === 'wrong_code' || code === 'not_verified') return 'Not that code';
  if (code === 'code_expired') return 'That code ran out';
  if (code === 'too_many_attempts') return 'Too many tries';
  if (code === 'bad_phone') return 'Not a US number';
  if (code === 'rate_limited' && retryAfter) return `Again in ${retryAfter} s`;
  return 'Not sent';
}

export function PhoneSignIn({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<'number' | 'code'>('number');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [stamp, setStamp] = useState<{ text: string; at: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [proved, setProved] = useState(0);              // the frame the six land
  const [resend, setResend] = useState(false);          // "Send it again", faint, after 30 s
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (f: () => void, t: number) => { timers.current.push(setTimeout(f, t)); };
  const codeField = useRef<TextInput>(null);

  const armResend = (after = RESEND_MS) => { setResend(false); later(() => setResend(true), after); };

  const send = async () => {
    if (busy || !validUS(digits)) return;
    setBusy(true); setStamp(null);
    const r = await sendPhoneCode(`+1${digits}`);
    setBusy(false);
    if (r.ok) { feel.touch(); setCode(''); setPage('code'); armResend(); return; }
    // a code already on its way to this number: the code page, with the resend held for what is left
    if (r.code === 'rate_limited' && page === 'number' && r.retryAfter && r.retryAfter <= 30) { setCode(''); setPage('code'); armResend(r.retryAfter * 1000); return; }
    setStamp({ text: stampFor(r.code, r.retryAfter), at: Date.now() });
  };
  const again = async () => {
    if (busy) return;
    setResend(false); setBusy(true);
    const r = await sendPhoneCode(`+1${digits}`);
    setBusy(false);
    if (r.ok) { feel.touch(); setCode(''); setStamp(null); armResend(); codeField.current?.focus(); return; }
    setStamp({ text: stampFor(r.code, r.retryAfter), at: Date.now() });
    armResend(r.retryAfter ? r.retryAfter * 1000 : RESEND_MS);
  };

  const check = async (full: string) => {
    setBusy(true);
    const r = await verifyPhoneCode(full);
    setBusy(false);
    if (r.ok) {
      setProved(Date.now()); feel.held();   // the Success haptic and cloud-landed, on the frame the six turn green
      later(onDone, ms.swell + 180);
      return;
    }
    setCode('');                             // silence: the boxes empty, one stamp says why
    setStamp({ text: stampFor(r.code, r.retryAfter), at: Date.now() });
  };
  const type = (t: string) => {
    if (busy || proved) return;
    const c = t.replace(/\D/g, '').slice(0, 6);
    setCode(c);
    if (c.length > 0) setStamp(null);
    if (c.length === 6) void check(c);
  };

  return (
    <Arrive>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky, paddingTop: insets.top, paddingBottom: insets.bottom + theme.space.m }]}>
        <Sky />
        <Feather />
        {page === 'number' ? (
          <View style={s.page} key="number">
            <View style={s.middle}>
              <Label>Your number</Label>
              <TextInput value={formatUS(digits, ' ')} onChangeText={t => { setDigits(usDigits(t)); setStamp(null); }} onSubmitEditing={send}
                autoFocus keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" returnKeyType="send"
                maxLength={14} accessibilityLabel="Your number" style={[s.number, WEB_FIELD]} selectionColor={theme.color.accent} />
              <View style={[s.mark, validUS(digits) && s.markOn]} />
              <View style={s.stampRoom}>{stamp && <Stamp key={stamp.at} text={stamp.text} />}</View>
            </View>
            <CloudButton label="Text me a code" onPress={validUS(digits) && !busy ? send : undefined} disabled={!validUS(digits)}
              accessibilityLabel="Text me a code" accessibilityHint="Sends a six digit code to this number" />
          </View>
        ) : (
          <Settle key="code" style={s.page}>
            <View style={s.middle}>
              {/* the code sits under the number it went to; a tap on the number goes back to change it */}
              <Pressable onPress={proved ? undefined : () => { setPage('number'); setStamp(null); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Sent to ${formatUS(digits)}`} accessibilityHint="Change the number">
                <Label>{formatUS(digits)}</Label>
              </Pressable>
              <Six code={code} proved={proved} onPress={() => codeField.current?.focus()}>
                <TextInput ref={codeField} value={code} onChangeText={type} autoFocus caretHidden maxLength={6}
                  keyboardType="number-pad" textContentType="oneTimeCode" autoComplete={Platform.OS === 'web' ? 'one-time-code' : 'sms-otp'}
                  accessibilityLabel="Code" accessibilityHint="Six digits from the text" style={[s.hidden, WEB_FIELD]} />
              </Six>
              <View style={s.stampRoom}>{stamp && <Stamp key={stamp.at} text={stamp.text} />}</View>
            </View>
            {/* the room is always kept, so nothing moves when the line comes back */}
            <View style={s.resendRoom}>
              {resend && !proved && (
                <Animated.View entering={FadeIn.duration(ms.land)}>
                  <Pressable onPress={again} hitSlop={12} accessibilityRole="button" accessibilityLabel="Send it again">
                    <Text style={s.resend}>Send it again</Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </Settle>
        )}
        {/* "Not now" sits top left on the glass but comes last in the reading order: after the field and the
            verb, so a screen reader meets the one action first. Absolute, so moving it here moves nothing. */}
        {!proved && (
          <Pressable onPress={onCancel} hitSlop={12} style={[s.later, { top: insets.top + theme.space.s }]} accessibilityRole="button" accessibilityLabel="Not now">
            <Text style={s.laterText}>Not now</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </Arrive>
  );
}

/** The six boxes. The next one to fill carries the accent rule; on the proof every rule turns green and the
    row breathes once (1, 1.03, 1 over 420 ms). The hidden field lies over the row, so a tap anywhere on it
    brings the keyboard back. */
function Six({ code, proved, onPress, children }: { code: string; proved: number; onPress: () => void; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const sw = useSharedValue(1);
  useEffect(() => {
    if (!proved || reduce) return;
    sw.value = withSequence(withTiming(cloud.swell, { duration: ms.swell / 2, easing: BREATH }), withTiming(1, { duration: ms.swell / 2, easing: BREATH }));
  }, [proved]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sw.value }] }));
  return (
    <Pressable onPress={onPress} accessible={false} style={s.sixHit} accessibilityLabel="Code">
      <Animated.View style={[s.six, st]}>
        {Array.from({ length: 6 }, (_, i) => {
          const d = code[i];
          const next = !proved && i === code.length;
          return (
            <View key={i} style={[s.box, proved ? s.boxProved : null]}>
              {d ? <Animated.Text key={`${i}${d}`} entering={FadeIn.duration(ms.press)} style={s.digit}>{d}</Animated.Text> : null}
              <View style={[s.boxMark, next && s.markOpen, proved ? s.markOn : null]} />
            </View>
          );
        })}
      </Animated.View>
      {children}
    </Pressable>
  );
}

/** The stamp: pressed down from 1.08x in 160 ms, in the warn ink. Silent. Reduced motion: it fades in. */
function Stamp({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: ms.stamp, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: reduce ? 1 : 1.08 - 0.08 * k.value }] }));
  return <Animated.View style={st} accessibilityLiveRegion="polite"><Label ink={theme.color.warn}>{text}</Label></Animated.View>;
}

/** The whole page arriving over the Bid sheet: in, 200 ms. */
function Arrive({ children }: { children: React.ReactNode }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: ms.sheetFade, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, st]}>{children}</Animated.View>;
}

/** The code page settling where the number page was: down from 8 pt above and in, 420 ms on the house
    out-curve. Reduced motion: the fade only. */
function Settle({ children, style }: { children: React.ReactNode; style: object }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: ms.page, easing: CLOUD_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: reduce ? 0 : cloud.settleY * (1 - k.value) }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: theme.space.m, paddingTop: theme.space.xl },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.s },
  later: { position: 'absolute', left: theme.space.m, zIndex: 2 },
  laterText: { ...theme.type.sans, fontSize: 17, color: theme.color.faint },
  // the number owns the page: Bodoni, upright, tabular so it does not shuffle as it fills
  number: { fontFamily: theme.font.price, fontSize: 40, color: theme.color.ink, textAlign: 'center', fontVariant: ['tabular-nums'], alignSelf: 'stretch', paddingVertical: 0, minHeight: 52 },
  mark: { width: 18, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: -6 },
  markOn: { backgroundColor: theme.color.good },
  markOpen: { backgroundColor: theme.color.accent },
  stampRoom: { height: 28, justifyContent: 'center' },
  sixHit: { alignSelf: 'center' },
  six: { flexDirection: 'row', gap: BOX_GAP },
  // a soft cloud cell, lit from above: white body, the line for an edge, a long faint shade under it
  box: { width: BOX_W, height: BOX_H, borderRadius: 14, backgroundColor: theme.color.cloud, borderWidth: 1, borderColor: theme.color.line, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.color.ink, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  boxProved: { borderColor: 'rgba(38,116,79,0.35)' },
  boxMark: { position: 'absolute', bottom: 9, width: 18, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  digit: { fontFamily: theme.font.price, fontSize: 34, color: theme.color.ink, fontVariant: ['tabular-nums'] },
  hidden: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.011, color: 'transparent', fontSize: 1 },
  resendRoom: { height: 44, alignItems: 'center', justifyContent: 'center' },
  resend: { ...theme.type.sans, fontSize: 17, color: theme.color.faint, paddingVertical: 6 },
});
