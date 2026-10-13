/* Obavia live clouds: the shared WebGL2 engine, written from scratch (no three.js, nothing vendored).
   docs/design/cloud-system.md §1, §2 and §8. One file, two homes: obavia-co/cloud3d-engine.js and
   desk/src/cloud3d-engine.js are byte-identical; desk/src/cloud3d.test.ts fails if they drift.

   - The noise: a 64^3 tileable Perlin-Worley volume (R) plus three Worley octaves (G, B, A), built on
     the GPU once per context, one slice per draw, into a mipmapped 3D texture.
   - The sky: a cumulus deck below the camera, raymarched at half resolution (44 steps), Beer-Lambert
     extinction, a beer-powder term, dual-lobe Henyey-Greenstein single scatter from a low warm sun,
     ambient from the house sky gradient, aerial haze into the page's own gradient. Time drifts it;
     scroll lowers the camera, so the near bank moves more than the far one (real parallax).
   - The button: a small cloud volume (a soft body plus seeded lobes, eroded by billow noise) seen from
     a little above, so it has a near side and a far side; its own contact shadow on the page.
     Press, hold, release, hover and landed are uniforms (cloud-system §2), driven by GSAP.
   - Fallback chain: WebGL2, then the Blender sprites (assets/cloud-3d contract), then the CSS cloud.
   Flags for tests: ?cloud3d=off (no WebGL), ?cloud3d-bench (gl.finish timing per frame),
   ?cloud3d-governor=off (no quality step-down), ?cloud3d-t=<s> (a fixed time). */

const VS = `#version 300 es
out vec2 vUv;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;

const NOISE_FS = `#version 300 es
precision highp float;
uniform float uSlice, uSize;
out vec4 o;
vec3 h33(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float grad(vec3 x,float per){
  vec3 i=floor(x),f=fract(x),u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h33(mod(i,per))*2.-1.,f);
  float b=dot(h33(mod(i+vec3(1,0,0),per))*2.-1.,f-vec3(1,0,0));
  float c=dot(h33(mod(i+vec3(0,1,0),per))*2.-1.,f-vec3(0,1,0));
  float d=dot(h33(mod(i+vec3(1,1,0),per))*2.-1.,f-vec3(1,1,0));
  float e=dot(h33(mod(i+vec3(0,0,1),per))*2.-1.,f-vec3(0,0,1));
  float g=dot(h33(mod(i+vec3(1,0,1),per))*2.-1.,f-vec3(1,0,1));
  float h=dot(h33(mod(i+vec3(0,1,1),per))*2.-1.,f-vec3(0,1,1));
  float k=dot(h33(mod(i+vec3(1,1,1),per))*2.-1.,f-vec3(1,1,1));
  return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),mix(mix(e,g,u.x),mix(h,k,u.x),u.y),u.z);
}
float worley(vec3 x,float per){
  vec3 i=floor(x),f=fract(x); float d=9.;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int w=-1;w<=1;w++){
    vec3 q=vec3(w,y,z), r=q+h33(mod(i+q,per)+71.)-f; d=min(d,dot(r,r)); }
  return 1.-clamp(sqrt(d),0.,1.);
}
float wf(vec3 p,float f){ return worley(p*f,f)*.625+worley(p*f*2.,f*2.)*.25+worley(p*f*4.,f*4.)*.125; }
float pf(vec3 p,float f){ float s=0.,a=.5; for(int k=0;k<5;k++){ s+=a*grad(p*f,f); f*=2.; a*=.5; } return s; }
void main(){
  vec3 p=vec3(gl_FragCoord.xy,uSlice+.5)/uSize;
  float per=clamp(pf(p,4.)*1.5+.5,0.,1.);
  float w4=wf(p,4.);
  float pw=clamp((per-(w4-1.))/(2.-w4),0.,1.);
  o=vec4(pw,w4,wf(p,8.),wf(p,12.));
}`;

const LIB = `
float remap(float v,float a,float b,float c,float d){ return c+(v-a)/(b-a)*(d-c); }
float fbm3(vec4 n){ return n.g*.625+n.b*.25+n.a*.125; }
float hg(float c,float g){ float g2=g*g; return (1.-g2)/pow(1.+g2-2.*g*c,1.5); }
float ign(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715)))); }
`;

const SKY_FS = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec2 uRes;
uniform float uTime, uLift, uLod;
out vec4 o;
${LIB}
const vec3 SUN=normalize(vec3(-.78,.42,.32));
const vec3 SUNC=vec3(1.,.955,.89);
const vec3 SHADE=vec3(.66,.72,.84);
const float YB=-2.5, YT=-.62;
vec3 page(float v){
  vec3 c0=vec3(.863,.902,.992), c1=vec3(.949,.965,1.), c2=vec3(.969,.976,1.), c3=vec3(.902,.929,.992);
  return v<.45 ? mix(c0,c1,v/.45) : v<.8 ? mix(c1,c2,(v-.45)/.35) : mix(c2,c3,(v-.8)/.2);
}
float dens(vec3 p,float lod,bool det){
  float h=(p.y-YB)/(YT-YB);
  if(h<0.||h>1.) return 0.;
  vec3 q=p+vec3(uTime*.0042,0.,uTime*.0016);
  float wc=textureLod(uNoise,vec3(q.xz*.06,.37),0.).r;
  float cov=clamp(remap(wc,.25,.8,.08,.6),0.,1.);
  float top=.42+.58*smoothstep(.3,.85,wc);
  float prof=clamp(h/.09,0.,1.)*clamp(remap(h,top*.45,top,1.,0.),0.,1.);
  vec4 n=textureLod(uNoise,q*vec3(.16,.22,.16)+vec3(0.,0.,uTime*.0009),lod);
  float base=remap(n.r,fbm3(n)-1.,1.,0.,1.)*prof;
  base=remap(base,1.-cov,1.,0.,1.)*cov;
  if(base<=0.) return 0.;
  if(det){
    vec4 d=textureLod(uNoise,q*.62+vec3(uTime*.005,uTime*.002,0.),lod);
    float hf=fbm3(d);
    hf=mix(1.-hf,hf,clamp(h*3.,0.,1.));
    base=remap(base,hf*.55,1.,0.,1.);
  }
  return clamp(base,0.,1.);
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec2 uv=(fc-.5*uRes)/uRes.y;
  float d0=ign(fc);
  vec3 bg=page(1.-fc.y/uRes.y);
  float gw=length((fc/uRes-vec2(.5,.56))*vec2(uRes.x/uRes.y,1.));
  bg=mix(bg,vec3(1.),.32*smoothstep(.8,0.,gw));
  vec3 ro=vec3(0.,-uLift,0.);
  float pit=-.16;
  vec3 fw=vec3(0.,sin(pit),cos(pit)), rt=vec3(1.,0.,0.), up=cross(fw,rt);
  vec3 rd=normalize(fw*1.15+rt*uv.x+up*uv.y);
  vec3 col=bg;
  if(rd.y<-.004){
    float t0=(YT-ro.y)/rd.y, t1=min((YB-ro.y)/rd.y,24.);
    if(t1>t0){
      const int N=48;
      float dt=(t1-t0)/float(N), t=t0+dt*d0;
      float cth=dot(rd,SUN), ph=.5*hg(cth,.6)+.5*hg(cth,-.25);
      float T=1., tw=0., ww=0.; vec3 L=vec3(0.);
      for(int i=0;i<N;i++){
        vec3 p=ro+rd*t;
        float lod=clamp(log2(max(t*uLod,1.)),0.,5.);
        float d=dens(p,lod,true);
        if(d>.002){
          float ls=dens(p+SUN*.1,lod,false)*.1+dens(p+SUN*.28,lod,false)*.18+dens(p+SUN*.62,lod+1.,false)*.34;
          float Tl=max(exp(-ls*9.),.3*exp(-ls*2.2));
          float pw=1.-exp(-d*7.);
          float h=clamp((p.y-YB)/(YT-YB),0.,1.);
          vec3 amb=mix(SHADE,vec3(.985,.99,1.),smoothstep(0.,.75,h));
          vec3 lum=SUNC*Tl*(ph*mix(.5,1.,pw)*.5+(1.-pw)*.42)+amb*.8;
          float a=1.-exp(-d*dt*22.);
          L+=T*a*lum; tw+=T*a*t; ww+=T*a; T*=1.-a;
          if(T<.012) break;
        }
        t+=dt;
      }
      float dist=ww>0.?tw/ww:t1;
      float fog=max(1.-exp(-dist*.06),smoothstep(7.,22.,t0));
      col=mix(L,bg*(1.-T),fog)+T*bg;
    }
  }
  col+=(d0-.5)/255.;
  o=vec4(col,1.);
}`;

const BTN_FS = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec4 uBox;
uniform vec4 uLobe[14];
uniform int uLobeN;
uniform vec4 uWisp[10];
uniform int uWispN;
uniform float uTime, uSeed, uTop;
uniform vec4 uPress;
uniform vec4 uAir;
out vec4 o;
${LIB}
const vec3 SUN=normalize(vec3(-.42,.74,.52));
const vec3 SUNC=vec3(1.,.96,.9);
const vec3 SKY=vec3(.98,.986,1.), UNDER=vec3(.71,.76,.89), INK=vec3(.11,.14,.21);
const float BASE=-.62;
float sdRB(vec3 p,vec3 b,float r){ vec3 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float field(vec3 p){
  float d=sdRB(p-vec3(0.,-.2,0.),vec3(max(uBox.w-.12,.2),.37,.42),.36);
  for(int i=0;i<14;i++){ if(i>=uLobeN) break;
    vec4 l=uLobe[i];
    d=smin(d,length(p-l.xyz)-l.w*(1.+.015*uAir.y*step(0.,l.z)),.32);
  }
  return max(d,BASE-p.y);
}
float dens(vec3 p0,bool det){
  vec3 p=p0;
  p.y=BASE+(p.y-BASE)/uPress.x;
  p.xy=vec2(0.,-.1)+(p.xy-vec2(0.,-.1))/uPress.w;
  float sd=field(p);
  float d=0.;
  vec3 q=p*(1.-.2*uAir.x)*vec3(.5,.56,.5)+vec3(uSeed,uTime*.005,uTime*.0035);
  if(sd<.5){
    vec4 n=textureLod(uNoise,q,0.);
    sd+=(.62-n.r)*.42+(.5-n.g)*.18;
    float s=smoothstep(.16,-.22,sd);
    float sh=clamp(remap(s,(1.-n.r)*.4,1.,0.,1.),0.,1.);
    if(det&&sh>0.&&sh<.995){
      vec4 dn=textureLod(uNoise,q*2.9+vec3(0.,uTime*.008,0.),0.);
      float hf=fbm3(dn);
      hf=mix(1.-hf,hf,smoothstep(BASE,BASE+.35,p.y));
      sh=clamp(remap(sh,hf*(.46+.3*uAir.x),1.,0.,1.),0.,1.);
    }
    d=sh*uPress.y;
  }
  for(int i=0;i<10;i++){ if(i>=uWispN) break;
    vec4 w=uWisp[i];
    float r=length((p0-vec3(w.xy,.12))/vec3(w.z,w.z*.8,w.z));
    if(r<1.){
      vec4 n=textureLod(uNoise,p0*1.4+vec3(float(i)*.37,uTime*.01,0.),0.);
      d+=w.w*smoothstep(1.,.15,r)*smoothstep(.15,.7,n.r+.25*(1.-r));
    }
  }
  return d;
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec2 P=(fc-uBox.xy)/uBox.z;
  float d0=ign(fc);
  vec3 E=vec3(0.,2.6,13.);
  vec3 rd=normalize(vec3(P,0.)-E);
  vec3 bmin=vec3(-uBox.w-1.2,BASE-.05,-1.05), bmax=vec3(uBox.w+1.2,uTop,1.05);
  vec3 inv=1./rd, ta=(bmin-E)*inv, tb=(bmax-E)*inv, tn=min(ta,tb), tx=max(ta,tb);
  float t0=max(max(tn.x,tn.y),tn.z), t1=min(min(tx.x,tx.y),tx.z);
  vec3 L=vec3(0.); float T=1.;
  if(t1>t0){
    const int N=40;
    float dt=(t1-t0)/float(N), t=t0+dt*d0;
    float sun=.42*(1.+.08*uAir.y)*(1.-.12*uPress.z);
    for(int i=0;i<N;i++){
      vec3 p=E+rd*t;
      float d=dens(p,true);
      if(d>.003){
        float ls=dens(p+SUN*.09,false)*.09+dens(p+SUN*.22,false)*.13+dens(p+SUN*.42,false)*.2;
        float Tl=max(exp(-ls*11.*uPress.y),.3*exp(-ls*2.6));
        float hn=clamp((p.y-BASE)/1.5,0.,1.);
        vec3 amb=mix(UNDER*(1.-.07*uPress.z),SKY,smoothstep(0.,.8,hn));
        float pw=1.-exp(-d*6.);
        vec3 lum=SUNC*Tl*sun*(mix(.6,1.,pw)+(1.-pw)*1.4)+amb*.75;
        float a=1.-exp(-d*dt*11.);
        L+=T*a*lum; T*=1.-a;
        if(T<.008) break;
      }
      t+=dt;
    }
  }
  float sy=BASE-.05-uAir.z;
  vec2 sp=vec2(P.x/(uBox.w+.5+.12*uAir.y-.06*uAir.w),(P.y-sy)/(.17+.07*uAir.y-.05*uAir.w));
  float sa=exp(-pow(abs(sp.x),6.))*exp(-sp.y*sp.y*1.5)*(.12+.05*uAir.w-.025*uAir.y);
  float a=1.-T;
  vec3 col=L+T*INK*sa;
  a+=T*sa;
  col+=(d0-.5)/255.*a;
  o=vec4(col,a);
}`;

export const GLSL = { VS, NOISE_FS, SKY_FS, BTN_FS };

/* ---------- small helpers ---------- */
const query = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
const FLAG_OFF = query.get('cloud3d') === 'off' || (typeof window !== 'undefined' && window.OCLOUD3D_OFF === true);
const BENCH = query.has('cloud3d-bench');
const NO_GOV = query.get('cloud3d-governor') === 'off' || BENCH;
const FIXED_T = query.has('cloud3d-t') ? Number(query.get('cloud3d-t')) || 0 : null;
const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : f => setTimeout(() => f(performance.now()), 16);
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** The §2 spring as an ease: damping z, response r (s), over a tween of T s (same curve as site.js RISE). */
const spring = (z, r, T) => { const w = 2 * Math.PI / r, s = Math.sqrt(Math.max(1e-6, 1 - z * z)), wd = w * s;
  return p => p >= 1 ? 1 : z < 1 ? 1 - Math.exp(-z * w * p * T) * (Math.cos(wd * p * T) + z / s * Math.sin(wd * p * T)) : 1 - Math.exp(-w * p * T) * (1 + w * p * T); };
const RISE = spring(.65, .3, .6), FLAT = spring(1, .3, .6);
const image = url => new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = url; });
const firstImage = async urls => { for (const u of urls) { try { return await image(u); } catch (e) { /* next */ } } return null; };

function glContext(canvas, alpha) {
  if (FLAG_OFF) return null;
  try {
    return canvas.getContext('webgl2', { alpha, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false });
  } catch (e) { return null; }
}
function build(gl, fs) {
  const p = gl.createProgram();
  [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]].forEach(([type, src]) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(p, s);
  });
  gl.linkProgram(p);
  return p;
}
/** Resolves when the driver has linked the program; KHR_parallel_shader_compile keeps the main thread free meanwhile. */
function linked(gl, p) {
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  return new Promise((ok, no) => {
    const check = () => {
      if (ext && !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR)) { setTimeout(check, 16); return; }
      if (gl.getProgramParameter(p, gl.LINK_STATUS)) { ok(p); return; }
      const logs = gl.getAttachedShaders(p).map(s => gl.getShaderInfoLog(s)).join('\n');
      no(new Error('cloud3d: link failed ' + gl.getProgramInfoLog(p) + logs));
    };
    check();
  });
}
function uniforms(gl, p) {
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); }
  return u;
}
/** The noise volume, rendered on the GPU slice by slice: about 64 tiny draws, once per context. */
function noiseVolume(gl, prog, size) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, tex);
  const levels = Math.log2(size) + 1;
  gl.texStorage3D(gl.TEXTURE_3D, levels, gl.RGBA8, size, size, size);
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R].forEach(k => gl.texParameteri(gl.TEXTURE_3D, k, gl.REPEAT));
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.useProgram(prog);
  const u = uniforms(gl, prog);
  gl.uniform1f(u.uSize, size);
  gl.viewport(0, 0, size, size);
  for (let z = 0; z < size; z++) {
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex, 0, z);
    if (z === 0 && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('cloud3d: 3D target incomplete');
    gl.uniform1f(u.uSlice, z);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  gl.generateMipmap(gl.TEXTURE_3D);
  return tex;
}
async function context(canvas, fs, alpha) {
  const gl = glContext(canvas, alpha);
  if (!gl) return null;
  const np = build(gl, NOISE_FS), mp = build(gl, fs);
  await Promise.all([linked(gl, np), linked(gl, mp)]);
  gl.bindVertexArray(gl.createVertexArray());
  const tex = noiseVolume(gl, np, 64);
  gl.deleteProgram(np);
  gl.useProgram(mp);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, tex);
  const u = uniforms(gl, mp);
  gl.uniform1i(u.uNoise, 0);
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  return { gl, u, timer, lost: false };
}

/* ---------- frame statistics (Performance API) ---------- */
function meter(name) {
  const m = { name, cpu: [], gpu: [], frames: 0, scale: 0, pending: [] };
  m.begin = (c) => {
    if (c.timer && !m.pending.length) { const q = c.gl.createQuery(); c.gl.beginQuery(c.timer.TIME_ELAPSED_EXT, q); m.q = q; }
    m.t0 = performance.now();
  };
  m.end = (c) => {
    const gl = c.gl;
    if (m.q) { gl.endQuery(c.timer.TIME_ELAPSED_EXT); m.pending.push(m.q); m.q = null; }
    if (BENCH) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, m.px || (m.px = new Uint8Array(4)));   // a 1 px read waits for the GPU; finish() does not in every driver
    const ms = performance.now() - m.t0;
    if (BENCH) { try { performance.measure('cloud3d-' + name, { start: m.t0, end: m.t0 + ms }); } catch (e) { /* old API */ } }
    m.cpu.push(ms); if (m.cpu.length > 240) m.cpu.shift();
    m.frames++;
    while (m.pending.length) {
      const q = m.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      if (!gl.getParameter(c.timer.GPU_DISJOINT_EXT)) { m.gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); if (m.gpu.length > 240) m.gpu.shift(); }
      gl.deleteQuery(q); m.pending.shift();
    }
  };
  return m;
}
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/**
 * createCloud3D(options) → the engine for one page.
 * options: { gsap, assets (base URL of the cloud-3d contract), sound: { play(name, gain), loop(name, gain) → { stop() } },
 *            reduced(): boolean, paused(): boolean, liveMax (default 3) }
 */
export function createCloud3D(opt) {
  const G = opt.gsap;
  const assets = opt.assets || '';
  const sound = opt.sound || {};
  const reduced = opt.reduced || (() => false);
  const paused = opt.paused || (() => false);
  const LIVE_MAX = opt.liveMax || 3;
  const fine = typeof matchMedia === 'function' ? matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  const dpr = () => Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
  const now = () => performance.now();
  const T = () => FIXED_T !== null ? FIXED_T : (Date.now() / 1000) % 86400;   // wall clock, so a page change never jumps the sky
  const stats = { sky: null, button: null, mode: {} };
  const E = { stats, GLSL, gl: !FLAG_OFF && typeof WebGL2RenderingContext !== 'undefined' };

  /* ---------- the sky ---------- */
  E.sky = async (host, o = {}) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'c3d-sky'; canvas.setAttribute('aria-hidden', 'true');
    let c = null;
    try { c = await context(canvas, SKY_FS, false); } catch (e) { c = null; if (opt.debug) console.warn(e); }
    if (!c) { stats.mode.sky = await E.skySprites(o.layers || {}) ? 'sprites' : 'layers'; return null; }
    stats.mode.sky = 'webgl2';
    host.insertBefore(canvas, o.before || host.firstChild);
    const { gl, u } = c, m = stats.sky = meter('sky');
    let scale = o.scale || .5, rate = o.rate || 30, last = -1e9, dirty = true, alive = true, w = 0, h = 0;
    let slow = 0, prev = 0;
    const size = () => {
      const r = host.getBoundingClientRect(), W = Math.max(1, Math.round(r.width * scale)), H = Math.max(1, Math.round(r.height * scale));
      if (W !== w || H !== h) { w = canvas.width = W; h = canvas.height = H; dirty = true; }
      m.scale = scale;
    };
    const draw = () => {
      if (c.lost) return;
      size();
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uTime, reduced() ? 600 : T());
      gl.uniform1f(u.uLift, reduced() ? 0 : (o.lift ? o.lift() : 0));
      gl.uniform1f(u.uLod, 1 / (h * 1.15 * (1 / (64 * .16))));
      m.begin(c); gl.drawArrays(gl.TRIANGLES, 0, 3); m.end(c);
    };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { dirty = true; }) : null;
    if (ro) ro.observe(host); else addEventListener('resize', () => { dirty = true; });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); c.lost = true; host.classList.remove('c3d-sky-on'); canvas.remove(); });
    const tick = t => {
      if (!alive || c.lost) return;
      const still = reduced() || paused() || FIXED_T !== null;
      const due = !still && t - last >= 1000 / rate - 2;
      if (!document.hidden && (dirty || due)) {
        draw(); dirty = false;
        // governor: a slow frame rhythm while we draw steps the resolution down, then the rate
        if (!NO_GOV && prev && t - prev < 120) {
          slow = t - prev > 24 ? slow + 1 : Math.max(0, slow - 1);
          if (slow > 24) { slow = 0; if (scale > .3) { scale = Math.max(.28, scale * .8); dirty = true; } else rate = Math.min(rate, 8); }
        }
        prev = t; last = t;
      } else prev = 0;
      raf(tick);
    };
    draw(); dirty = false; last = now();
    raf(() => host.classList.add('c3d-sky-on'));
    raf(tick);
    return {
      canvas,
      poke() { dirty = true; },
      setRate(fps) { rate = fps; },
      destroy() { alive = false; if (ro) ro.disconnect(); host.classList.remove('c3d-sky-on'); canvas.remove(); const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); },
    };
  };
  /** The Blender sky layers (assets/cloud-3d/sky/light), tileable, over the existing layers; false when they are not there yet. */
  E.skySprites = async (layers) => {
    const keys = Object.keys(layers).filter(k => layers[k]);
    if (!keys.length) return false;
    const x2 = dpr() > 1.4 ? 2 : 1;
    const ok = await firstImage([`${assets}sky/light/far@${x2}x.webp`]);
    if (!ok) return false;
    keys.forEach(k => {
      const s = layers[k].style;
      s.backgroundImage = `url(${assets}sky/light/${k}@${x2}x.webp)`;
      s.backgroundRepeat = 'repeat-x'; s.backgroundSize = 'auto 100%';
    });
    return true;
  };

  /* ---------- the buttons ---------- */
  const B = new Map();
  let bc = null, bcWait = null, glc = null, loop = false;
  const liveCount = () => { let n = 0; B.forEach(b => { if (b.mode === 'gl') n++; }); return n; };
  const bctx = () => {
    if (bcWait) return bcWait;
    glc = document.createElement('canvas'); glc.width = 512; glc.height = 256;
    bcWait = context(glc, BTN_FS, true).then(c => {
      bc = c; if (c) { stats.button = meter('button'); glc.addEventListener('webglcontextlost', e => { e.preventDefault(); c.lost = true; B.forEach(b => { if (b.mode === 'gl') demote(b); }); }); }
      return c;
    }).catch(e => { if (opt.debug) console.warn(e); return null; });
    return bcWait;
  };
  let spriteSet = null;
  const sprites = () => spriteSet || (spriteSet = (async () => {
    const x2 = dpr() > 1.4 ? 2 : 1, sets = {};
    for (const wdt of [320, 440, 640]) {
      const base = `${assets}button/light/${wdt}/`;
      const rest = await firstImage([`${base}rest@${x2}x.webp`, `${base}rest@${x2}x.png`, `${base}rest.png`]);
      if (!rest) continue;
      const pressed = await firstImage([`${base}pressed@${x2}x.webp`, `${base}pressed@${x2}x.png`, `${base}pressed.png`]);
      let sheet = null;
      try {
        const r = await fetch(`${base}sheet.json`);
        if (r.ok) { const j = await r.json(), img = await firstImage([`${base}sheet.webp`, `${base}sheet.png`]); if (img) sheet = { img, frames: frameRects(j, img) }; }
      } catch (e) { /* no sheet: crossfade */ }
      sets[wdt] = { rest: rest.src, pressed: pressed ? pressed.src : null, sheet };
    }
    return Object.keys(sets).length ? sets : null;
  })());
  /** sheet.json: an array of {x,y,w,h}, or {frames:[...]} / {frames:{name:{frame:{x,y,w,h}}}} (TexturePacker), or a grid {cols,rows,frameWidth,frameHeight}. */
  function frameRects(j, img) {
    let f = Array.isArray(j) ? j : j.frames;
    if (f && !Array.isArray(f)) f = Object.keys(f).sort().map(k => f[k].frame || f[k]);
    if (Array.isArray(f) && f.length) return f.map(r => ({ x: r.x, y: r.y, w: r.w || r.width, h: r.h || r.height }));
    const cols = j.cols || j.columns, fw = j.frameWidth || j.w, fh = j.frameHeight || j.h, n = j.count || j.frameCount || 24;
    if (!cols || !fw || !fh) return null;
    return Array.from({ length: n }, (_, i) => ({ x: (i % cols) * fw, y: Math.floor(i / cols) * fh, w: fw, h: fh }));
  }

  const EXT = { top: 1, bottom: .42, side: .8 };   // canvas reach beyond the box, in button heights
  function layout(b) {
    const el = b.el, w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) { b.w = 0; return false; }
    if (w === b.w && h === b.h) return true;
    b.w = w; b.h = h;
    const top = b.top * h, bot = EXT.bottom * h, side = EXT.side * h;
    Object.assign(b.wrap.style, { left: -side + 'px', top: -top + 'px', width: w + 2 * side + 'px', height: h + top + bot + 'px' });
    b.wrap.style.setProperty('--rw', Math.round(w * 1.25) + 'px'); b.wrap.style.setProperty('--rh', Math.round(h * 2.6) + 'px');
    if (b.mode === 'gl') {
      const q = dpr() * .75;
      b.canvas.width = Math.max(1, Math.round((w + 2 * side) * q)); b.canvas.height = Math.max(1, Math.round((h + top + bot) * q));
      b.q = q; b.side = side; b.bot = bot;
      const W = w / 2 / h, rnd = mulberry(hashStr((el.textContent || '').trim() + '|' + Math.round(W * 10)));
      const cap = .5 + b.top - .12, L = new Float32Array(56), put = (i, x, y, z, r) => L.set([x, y, z, r], i * 4);
      const span = Math.max(.25, W - .2), towers = Math.max(2, Math.min(6, Math.round(W * 2 / .95))), puffs = Math.max(1, towers - 1);
      let n = 0;
      for (let i = 0; i < towers; i++) {          // the back row: cumulus towers, tallest in the middle
        const u = towers === 1 ? .5 : i / (towers - 1), x = (-1 + 2 * u) * span * .92 + (rnd() - .5) * .22;
        const prof = 1 - Math.min(1, Math.pow(Math.abs(x) / (W + .3), 2)) * .55;
        const r = (.42 + .24 * rnd()) * Math.min(1, .62 + b.top * .45) * (.8 + .2 * prof);
        put(n++, x, Math.max(.02, Math.min(cap - r, .1 + (cap - r - .1) * prof * (.55 + .45 * rnd()))), -.16 + (rnd() - .5) * .18, r);
      }
      for (let i = 0; i < puffs; i++) {           // the front row: lower puffs between the towers, nearer the eye
        const u = (i + .5) / puffs, x = (-1 + 2 * u) * span * .85 + (rnd() - .5) * .2, r = .28 + .14 * rnd();
        put(n++, x, -.12 + .2 * rnd(), .26 + .08 * rnd(), r);
      }
      put(n++, -W + .02 - .06 * rnd(), -.2 + .08 * rnd(), .02, .36 + .08 * rnd());   // the two ends, rounded and uneven
      put(n++, W - .02 + .06 * rnd(), -.18 + .08 * rnd(), -.02, .34 + .1 * rnd());
      b.towers = towers; b.lobes = L; b.lobeN = n; b.seed = rnd() * 7; b.W = W;
    } else if (b.mode === 'sprite') placeSprite(b);
    b.dirty = true;
    return true;
  }
  function placeSprite(b) {
    const set = b.sprite, w = b.w, h = b.h;
    if (!set) return;
    // contract safe zone (assets/cloud-button/README.md): x 12 to 88 percent, y 40 to 85 percent of the sprite
    const sw = w / .76, sh = h / .45, side = EXT.side * h, top = b.top * h;
    const sx = side - .12 * sw, sy = top - .40 * sh;
    b.img.style.cssText = `left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;inset:auto`;
    if (b.sheetCanvas) { b.sheetCanvas.style.cssText = b.img.style.cssText; }
  }

  function drawButton(b, t) {
    if (!bc || bc.lost || !b.w) return;
    const { gl, u } = bc, cw = b.canvas.width, ch = b.canvas.height;
    if (glc.width < cw || glc.height < ch) { glc.width = Math.max(glc.width, cw); glc.height = Math.max(glc.height, ch); }
    const s = b.st, q = b.q;
    gl.viewport(0, 0, cw, ch);
    gl.uniform4f(u.uBox, (b.side + b.w / 2) * q, (b.bot + b.h / 2) * q, b.h * q, b.W);
    gl.uniform4fv(u.uLobe, b.lobes); gl.uniform1i(u.uLobeN, b.lobeN);
    gl.uniform1f(u.uTime, reduced() ? 300 : t); gl.uniform1f(u.uSeed, b.seed); gl.uniform1f(u.uTop, .5 + b.top);
    gl.uniform4f(u.uPress, s.squash, s.dens * (1 + .01 * s.hold), s.light, s.swell * (1 + .01 * s.hold));
    gl.uniform4f(u.uAir, s.loosen, s.sun, s.lift / b.h, s.shadow);
    const wn = wisps(b);
    gl.uniform1i(u.uWispN, wn); if (wn) gl.uniform4fv(u.uWisp, b.wispBuf);
    stats.button.begin(bc); gl.drawArrays(gl.TRIANGLES, 0, 3); stats.button.end(bc);
    b.ctx.globalCompositeOperation = 'copy';
    b.ctx.drawImage(glc, 0, glc.height - ch, cw, ch, 0, 0, cw, ch);
    b.drawn = true;
  }
  /** After a release: six to ten wisps leave the top edge, up and out 12 to 20 px, fading over 600 ms. */
  function wisps(b) {
    const w = b.wisp; if (!w) return 0;
    const k = (now() - w.t0) / 600;
    if (k >= 1) { b.wisp = null; return 0; }
    const e = 1 - Math.pow(1 - k, 3), buf = b.wispBuf || (b.wispBuf = new Float32Array(40)), rnd = mulberry(w.seed);
    for (let i = 0; i < w.n; i++) {
      const u = (i + .5) / w.n + (rnd() - .5) * .08, x0 = (-1 + 2 * u) * (b.W - .1);
      const lob = b.lobes, li = Math.min(b.towers - 1, Math.max(0, Math.round(u * b.towers - .5))) * 4;
      const y0 = Math.max(.42, lob[li + 1] + lob[li + 3] * .72);
      const ang = Math.atan2(1, (x0 / (b.W + .5)) * 1.3 + (rnd() - .5) * .5);
      const dist = (12 + 8 * rnd()) / b.h;
      buf.set([x0 + Math.cos(ang) * dist * e, y0 + Math.sin(ang) * dist * e, (.15 + .09 * rnd()) * (1 + .5 * e), 1.7 * Math.pow(1 - k, 1.5)], i * 4);
    }
    b.dirty = true;
    return w.n;
  }
  const tickButtons = t => {
    loop = false;
    if (bc && !bc.lost) {
      const tt = T(), still = reduced() || paused() || FIXED_T !== null;
      B.forEach(b => {
        if (b.mode !== 'gl' || !b.visible || document.hidden) return;
        const idle = !still && t - (b.last || 0) >= 100;     // a slow breath at 10 fps while it sits on the glass
        if (b.dirty || idle || !b.drawn) { if (layout(b)) drawButton(b, tt); b.dirty = false; b.last = t; }
        if (!still || b.wisp) loop = true;
      });
      B.forEach(b => { if (b.dirty) loop = true; });
    }
    if (loop) raf(tickButtons);
  };
  const kick = () => { if (!loop) { loop = true; raf(tickButtons); } };

  function wrapFor(b) {
    const wrap = document.createElement('span');
    wrap.className = 'c3d'; wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = '<i class="c3d-ring"></i>';
    b.ring = wrap.firstChild;
    return wrap;
  }
  function promote(b) {          // to the live volume
    b.mode = 'gl'; stats.mode.button = 'webgl2';
    b.canvas = document.createElement('canvas'); b.ctx = b.canvas.getContext('2d');
    b.wrap.appendChild(b.canvas);
    b.el.classList.add('c3d-on', 'c3d-gl');
    b.w = 0; layout(b); b.dirty = true;
  }
  function demote(b) {           // the live volume went away: sprites if they exist, else the CSS cloud
    if (b.canvas) b.canvas.remove(); b.canvas = null; b.el.classList.remove('c3d-gl');
    fallback(b);
  }
  async function fallback(b) {
    const set = await sprites();
    if (!B.has(b.el)) return;
    if (!set) { b.mode = 'css'; b.el.classList.remove('c3d-on'); stats.mode.button = stats.mode.button || 'css'; return; }
    const w = b.el.offsetWidth, key = w <= 320 ? 320 : w <= 440 ? 440 : 640, s = set[key] || set[640] || set[440] || set[320];
    b.mode = 'sprite'; b.sprite = s; stats.mode.button = stats.mode.button === 'webgl2' ? 'webgl2' : 'sprite';
    b.img = document.createElement('span'); b.img.className = 'c3d-img';
    b.img.innerHTML = `<i style="background-image:url(${s.rest})"></i><i class="p" style="background-image:url(${s.pressed || s.rest})"></i>`;
    b.wrap.appendChild(b.img);
    if (s.sheet && s.sheet.frames) { b.sheetCanvas = document.createElement('canvas'); b.sheetCanvas.className = 'c3d-sheet'; b.wrap.appendChild(b.sheetCanvas); }
    b.el.classList.add('c3d-on');
    b.w = 0; layout(b);
  }
  /** Sprite sheet player: frames [a, b] over ms on a 2D canvas (the press is 24 frames over 400 ms: sink, puff, settle). */
  function playSheet(b, a, z, ms) {
    const sh = b.sprite && b.sprite.sheet; if (!sh || !b.sheetCanvas) return false;
    const cv = b.sheetCanvas, x = cv.getContext('2d'), f0 = sh.frames[0];
    cv.width = f0.w; cv.height = f0.h; b.img.style.opacity = '0';
    const t0 = now(), run = ++b.sheetRun;
    const step = () => {
      if (run !== b.sheetRun) return;
      const k = Math.min(1, (now() - t0) / ms), i = Math.round(a + (z - a) * k), r = sh.frames[Math.min(sh.frames.length - 1, i)];
      x.clearRect(0, 0, cv.width, cv.height); x.drawImage(sh.img, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height);
      if (k < 1) raf(step); else if (z >= sh.frames.length - 1) b.img.style.opacity = '';
    };
    step();
    return true;
  }

  /** Manage a button. live: may take one of the three live volumes. top: lobe reach above the box, in heights. */
  E.attach = (el, o = {}) => {
    if (B.has(el)) return B.get(el);
    const b = { el, top: o.top || EXT.top, mode: 'css', visible: true, sheetRun: 0, hover: false, pressed: false,
      st: { squash: 1, dens: 1, light: 0, swell: 1, loosen: 0, sun: 0, lift: 0, shadow: 0, hold: 0 } };
    b.wrap = wrapFor(b);
    el.appendChild(b.wrap);
    B.set(el, b);
    b.onDirty = () => { b.dirty = true; kick(); };
    // hover and focus (fine pointer only for hover; focus-visible for the keyboard)
    b.enter = () => { if (fine.matches) hoverIn(b, true); };
    b.leave = () => { if (b.hover && !b.focus) hoverOut(b); };
    b.focusIn = () => { let fv = false; try { fv = el.matches(':focus-visible'); } catch (e) { fv = true; } if (fv) { b.focus = true; el.classList.add('c3d-focus'); hoverIn(b, false); } };
    b.focusOut = () => { if (!b.focus) return; b.focus = false; el.classList.remove('c3d-focus'); if (!el.matches(':hover')) hoverOut(b); };
    el.addEventListener('pointerenter', b.enter); el.addEventListener('pointerleave', b.leave);
    el.addEventListener('focus', b.focusIn); el.addEventListener('blur', b.focusOut);
    if (typeof IntersectionObserver === 'function') { b.io = new IntersectionObserver(es => { b.visible = es[es.length - 1].isIntersecting; if (b.visible) b.onDirty(); }, { rootMargin: '80px' }); b.io.observe(el); }
    if (typeof ResizeObserver === 'function') { b.ro = new ResizeObserver(() => { b.w = -1; b.onDirty(); }); b.ro.observe(el); }
    const goLive = o.live && E.gl && liveCount() < LIVE_MAX;
    if (goLive && bc) { promote(b); drawButton(b, T()); b.drawn = true; kick(); }
    else if (goLive) {
      b.mode = 'pending';
      bctx().then(c => {
        if (!B.has(el)) return;
        if (!c || liveCount() >= LIVE_MAX) { fallback(b); return; }
        promote(b); drawButton(b, T());
        if (o.form && !reduced()) { G.fromTo(b.st, { dens: 0, swell: .96 }, { dens: 1, swell: 1, duration: .9, ease: 'expo.out', onUpdate: b.onDirty }); }
        kick();
      });
    } else fallback(b);
    return b;
  };
  E.detach = el => {
    const b = B.get(el); if (!b) return;
    B.delete(el); if (b.io) b.io.disconnect(); if (b.ro) b.ro.disconnect();
    el.removeEventListener('pointerenter', b.enter); el.removeEventListener('pointerleave', b.leave);
    el.removeEventListener('focus', b.focusIn); el.removeEventListener('blur', b.focusOut);
    if (b.breath) b.breath.stop(); clearTimeout(b.holdT);
    G.killTweensOf(b.st); b.wrap.remove(); el.classList.remove('c3d-on', 'c3d-gl', 'c3d-hover', 'c3d-focus');
  };
  E.has = el => B.has(el);
  /** React may replace a button's children; put the cloud back before the frame paints. */
  E.heal = el => { const b = B.get(el); if (b && !el.contains(b.wrap)) el.appendChild(b.wrap); };
  E.each = fn => B.forEach(fn);

  const off = el => el.disabled || el.getAttribute('aria-disabled') === 'true';
  const baseY = b => (b.hover && !reduced() ? -2 : 0);
  function hoverIn(b, withSound) {
    if (b.hover || off(b.el)) return;
    b.hover = true;
    b.el.classList.add('c3d-hover');
    if (withSound) {
      if (sound.play) sound.play('hover', 1);
      if (sound.loop) { if (b.breath) b.breath.stop(); b.breath = sound.loop('drift', .15); }
    }
    if (reduced()) { G.to(b.st, { sun: 1, duration: .18, ease: 'none', overwrite: 'auto', onUpdate: b.onDirty }); return; }
    G.to(b.st, { sun: 1, lift: 2, duration: .18, ease: 'expo.out', overwrite: 'auto', onUpdate: b.onDirty });
    if (!b.pressed) G.to(b.el, { y: -2, duration: .18, ease: 'expo.out', overwrite: 'auto' });
  }
  function hoverOut(b) {
    if (!b.hover) return;
    b.hover = false;
    b.el.classList.remove('c3d-hover');
    if (b.breath && !b.pressed) { b.breath.stop(); b.breath = null; }
    G.to(b.st, { sun: 0, lift: 0, duration: .6, ease: FLAT, overwrite: 'auto', onUpdate: b.onDirty });
    if (!b.pressed && !reduced()) G.to(b.el, { y: 0, duration: .6, ease: FLAT, overwrite: 'auto', clearProps: 'transform' });
  }

  /** Touch down: the field compresses (scaleY 0.94, density +15 percent, light shifts) over 100 ms; the box sinks (§2). */
  E.press = el => {
    const b = B.get(el); if (!b || off(el)) return;
    b.pressed = true;
    if (reduced()) { G.to(el, { opacity: .82, duration: .1, overwrite: 'auto' }); return; }
    G.to(el, { y: baseY(b) + 2.5, scale: .985, duration: .1, ease: 'power2.out', overwrite: 'auto' });
    G.to(b.st, { squash: .94, dens: 1.15, light: 1, shadow: 1, duration: .1, ease: 'power2.out', overwrite: 'auto', onUpdate: b.onDirty });
    if (b.mode === 'sprite') { if (!playSheet(b, 0, 5, 100)) G.to(b.img.lastChild, { opacity: 1, duration: .1, ease: 'power2.out', overwrite: 'auto' }); }
    clearTimeout(b.holdT);
    b.holdT = setTimeout(() => {           // held past 400 ms: the compressed cloud breathes, 1 percent on a 1.2 s sine
      if (!b.pressed) return;
      b.holdTw = G.to(b.st, { hold: 1, duration: .6, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: b.onDirty });
      if (sound.loop && !b.breath) b.breath = sound.loop('drift', .15);
    }, 400);
  };
  /** Touch up: rise on the §2 spring with a puff (swell 3 percent, wisps loosen), shed wisps, the air ring, the label dip. */
  E.release = (el, cancel) => {
    const b = B.get(el); if (!b) return;
    const was = b.pressed; b.pressed = false;
    clearTimeout(b.holdT); if (b.holdTw) { b.holdTw.kill(); b.holdTw = null; } b.st.hold = 0;
    if (b.breath && !b.hover) { b.breath.stop(); b.breath = null; }
    if (reduced()) { G.to(el, { opacity: 1, duration: .2, overwrite: 'auto', clearProps: 'opacity' }); b.onDirty(); return; }
    const y = baseY(b);
    G.to(el, { y, scale: 1, duration: .6, ease: cancel ? FLAT : RISE, overwrite: 'auto', clearProps: y ? '' : 'transform' });
    G.to(b.st, { squash: 1, dens: 1, light: 0, shadow: 0, duration: .6, ease: cancel ? FLAT : RISE, overwrite: 'auto', onUpdate: b.onDirty });
    if (b.mode === 'sprite') { if (!playSheet(b, 6, 23, 300)) G.to(b.img.lastChild, { opacity: 0, duration: .3, ease: cancel ? FLAT : RISE, overwrite: 'auto' }); }
    if (cancel || !was) return;
    G.timeline({ onUpdate: b.onDirty }).to(b.st, { swell: 1.03, loosen: 1, duration: .12, ease: 'power2.out' }).to(b.st, { swell: 1, loosen: 0, duration: .48, ease: 'sine.inOut' });
    shed(b); ring(b, .18);
    // the label dips a pixel and rises: the cloud lifts 1 px under it, then settles back
    G.timeline().to(b.wrap, { y: -1, duration: .08, ease: 'power2.out' }).to(b.wrap, { y: 0, duration: .5, ease: RISE, clearProps: 'transform' });
  };
  /** An action completed (§2 landed): the cloud breathes once, the sun catches it, the air ring goes once more. */
  E.landed = el => {
    const b = B.get(el); if (!b || !el.isConnected) return;
    if (reduced()) return;
    G.timeline({ onUpdate: b.onDirty })
      .to(b.st, { swell: 1.03, dens: 1.06, sun: Math.max(b.st.sun, .9), loosen: .5, duration: .21, ease: 'sine.inOut' })
      .to(b.st, { swell: 1, dens: 1, sun: b.hover ? 1 : 0, loosen: 0, duration: .21, ease: 'sine.inOut' });
    ring(b, .14);
  };
  function ring(b, peak) {
    G.killTweensOf(b.ring);
    G.timeline().fromTo(b.ring, { scale: 1, opacity: 0 }, { scale: 1.12, opacity: peak, duration: .12, ease: 'power2.out' })
      .to(b.ring, { scale: 1.4, opacity: 0, duration: .48, ease: 'sine.out' });
  }
  function shed(b) {
    const n = 6 + (hashStr(String(now())) % 5);
    if (b.mode === 'gl') { b.wisp = { t0: now(), n, seed: (Math.random() * 1e9) | 0 }; b.onDirty(); return; }
    // without the volume: soft DOM wisps on transform and opacity
    const top = b.top * b.h, side = EXT.side * b.h;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'), u = (i + .5) / n, size = Math.round(b.h * (.22 + .14 * Math.random()));
      s.className = 'c3d-wisp'; s.style.cssText = `--s:${size}px;left:${side + u * b.w - size / 2}px;top:${top - size * .55}px`;
      b.wrap.appendChild(s);
      const dx = (u - .5) * 2 * (6 + 6 * Math.random()), dy = -(12 + 8 * Math.random());
      G.fromTo(s, { x: 0, y: 0, opacity: .85, scale: .8 }, { x: dx, y: dy, opacity: 0, scale: 1.3, duration: .6, ease: 'expo.out', onComplete: () => s.remove() });
    }
  }
  return E;
}
