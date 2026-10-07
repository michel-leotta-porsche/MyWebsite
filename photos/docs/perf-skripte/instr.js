// Messhilfen, laufen vor dem Seitencode
(() => {
  const W = window;
  W.__m = { draw: { n: 0, ms: 0, max: 0 }, tex: { n: 0, ms: 0, max: 0, px: 0 }, frames: [], long: [], events: [], rec: false };
  const wrap = (proto, name, bucket, px) => {
    const orig = proto[name];
    proto[name] = function (...a) {
      const t = performance.now();
      const r = orig.apply(this, a);
      const d = performance.now() - t;
      const b = W.__m[bucket];
      b.n++; b.ms += d; b.max = Math.max(b.max, d);
      if (px) { const s = a[a.length - 1]; if (s && s.width) b.px += s.width * s.height; }
      return r;
    };
  };
  wrap(CanvasRenderingContext2D.prototype, "drawImage", "draw");
  wrap(WebGLRenderingContext.prototype, "texImage2D", "tex", true);
  let last = 0;
  const loop = (t) => { if (W.__m.rec && last) W.__m.frames.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => W.__m.rec && W.__m.long.push(e.duration))).observe({ type: "longtask", buffered: false });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => W.__m.rec && W.__m.events.push([e.name, e.duration, e.processingEnd - e.processingStart]))).observe({ type: "event", durationThreshold: 16, buffered: false });
  } catch {}
  W.__start = () => { W.__m.frames = []; W.__m.long = []; W.__m.events = []; W.__m.draw = { n: 0, ms: 0, max: 0 }; W.__m.tex = { n: 0, ms: 0, max: 0, px: 0 }; W.__m.rec = true; };
  W.__stop = () => {
    W.__m.rec = false;
    const f = W.__m.frames.slice().sort((a, b) => a - b);
    const q = (p) => f.length ? f[Math.min(f.length - 1, Math.floor(p * f.length))] : 0;
    const total = W.__m.frames.reduce((a, b) => a + b, 0);
    const ev = W.__m.events;
    return {
      fps: f.length ? +(1000 * f.length / total).toFixed(1) : 0,
      frameP50: +q(0.5).toFixed(1), frameP95: +q(0.95).toFixed(1), frameMax: +q(1).toFixed(1),
      jank: f.filter((x) => x > 50).length, frames: f.length,
      longN: W.__m.long.length, longMs: Math.round(W.__m.long.reduce((a, b) => a + b, 0)), longMax: Math.round(Math.max(0, ...W.__m.long)),
      drawImage: { n: W.__m.draw.n, ms: Math.round(W.__m.draw.ms), max: Math.round(W.__m.draw.max) },
      texImage2D: { n: W.__m.tex.n, ms: Math.round(W.__m.tex.ms), max: Math.round(W.__m.tex.max), mpx: +(W.__m.tex.px / 1e6).toFixed(1) },
      events: ev.length, eventMax: Math.round(Math.max(0, ...ev.map((e) => e[1]))), eventP75: ev.length ? Math.round(ev.map((e) => e[1]).sort((a, b) => a - b)[Math.floor(ev.length * 0.75)]) : 0,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
      imgDecodedMB: Math.round([...document.images].filter((i) => i.complete && i.naturalWidth).reduce((a, i) => a + i.naturalWidth * i.naturalHeight * 4, 0) / 1e6),
      imgs: document.images.length,
      canvasMB: Math.round([...document.querySelectorAll("canvas")].reduce((a, c) => a + c.width * c.height * 4, 0) / 1e6),
    };
  };
})();
