/* Types for cloud3d-engine.js (shared byte-for-byte with obavia-co/cloud3d-engine.js). */
export interface CloudSound {
  play?(name: string, gain?: number): void;
  loop?(name: string, gain?: number): { stop(): void };
}
export interface SkyHandle { canvas: HTMLCanvasElement; poke(): void; setRate(fps: number): void; destroy(): void }
export interface FrameMeter { name: string; cpu: number[]; gpu: number[]; frames: number; scale: number }
export interface Cloud3D {
  gl: boolean;
  stats: { sky: FrameMeter | null; button: FrameMeter | null; mode: Record<string, string> };
  GLSL: Record<'VS' | 'NOISE_FS' | 'SKY_FS' | 'BTN_FS', string>;
  sky(host: HTMLElement, o?: { before?: Node | null; layers?: Record<string, HTMLElement | null>; lift?: () => number; rate?: number; scale?: number }): Promise<SkyHandle | null>;
  skySprites(layers: Record<string, HTMLElement | null>): Promise<boolean>;
  attach(el: HTMLElement, o?: { live?: boolean; top?: number; form?: boolean }): unknown;
  detach(el: HTMLElement): void;
  has(el: Element): boolean;
  heal(el: HTMLElement): void;
  each(fn: (b: { el: HTMLElement }) => void): void;
  press(el: HTMLElement): void;
  release(el: HTMLElement, cancel?: boolean): void;
  landed(el: HTMLElement): void;
}
export const GLSL: Cloud3D['GLSL'];
export function createCloud3D(opt: {
  gsap: unknown; assets?: string; sound?: CloudSound;
  reduced?: () => boolean; paused?: () => boolean; liveMax?: number; debug?: boolean;
}): Cloud3D;
