/* The pickup scan: the buyer's pass is a QR the app draws as `obavia:<lot>:<vin>:<wonAt>`
   (auction/src/screens/won/Pickup.tsx). The Desk reads it with the phone's camera through the
   BarcodeDetector API where the browser ships one (Chrome on Android does; desktop Chrome on Linux and
   Windows does not; Safari on iPhone keeps it behind a feature flag, unverified on hardware). Where it does not,
   the screen says "Type The Pass" and never claims a scan it cannot do. Nothing here talks to the lane:
   the Worker checks the six against the car at POST /pickup. */

type Detected = { rawValue: string };
type Detector = { detect(source: CanvasImageSource): Promise<Detected[]> };
type DetectorCtor = { new (o?: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };
const ctor = (): DetectorCtor | undefined => (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

/** True when this browser can point a camera at a QR and read it. Synchronous, so the label is right on the first frame. */
export function canScan(): boolean {
  return typeof window !== 'undefined' && !!ctor() && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false;
}

/** The last six of the VIN from a pass for this lot, or null for anything else (another lot, another code). */
export function passSix(raw: string, lotId: string): string | null {
  const [tag, lot, vin] = raw.trim().split(':');
  if (tag !== 'obavia' || !lot || lot !== lotId || !vin) return null;
  const six = vin.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6);
  return six.length === 6 ? six : null;
}

/** Point the back camera into `video` and read QR codes until `onCode` returns true or `stop()` runs.
 *  `onFail` fires once if there is no camera or no permission; the caller falls back to typing, silently. */
export function startScan(video: HTMLVideoElement, onCode: (raw: string) => boolean, onFail: () => void): () => void {
  const D = ctor();
  let stream: MediaStream | null = null, raf = 0, stopped = false, busy = false, last = 0;
  const stop = () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; };
  if (!D) { onFail(); return stop; }
  const detector = new D({ formats: ['qr_code'] });
  const loop = (t: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (busy || t - last < 120 || video.readyState < 2) return; // about eight looks a second is plenty for a held pass
    busy = true; last = t;
    detector.detect(video).then(codes => { if (!stopped && codes.some(c => onCode(c.rawValue))) stop(); }).catch(() => { /* a frame it could not read */ }).finally(() => { busy = false; });
  };
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    .then(s => {
      if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s; video.srcObject = s; video.muted = true; video.playsInline = true;
      return video.play().then(() => { raf = requestAnimationFrame(loop); });
    })
    .catch(() => { if (!stopped) { stop(); onFail(); } });
  return stop;
}
