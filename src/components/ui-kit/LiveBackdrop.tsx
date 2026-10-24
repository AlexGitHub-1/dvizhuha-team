import { useEffect, useRef } from "react";

/**
 * Animated menu scene: distant citadel on a ridge, drifting fog, rising embers, rare lightning.
 * Canvas colors mirror brandbook tokens (charcoal, rust, blood, gold).
 */
export function LiveBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const g = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const embers = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.05, s: 1 + Math.random() * 2.2, ph: Math.random() * 6 }));
    let flash = 0, nextFlash = 4 + Math.random() * 6;
    // fixed ridge & city silhouette
    const ridge = Array.from({ length: 40 }, (_, i) => 0.72 + Math.sin(i * 0.9) * 0.025 + Math.sin(i * 2.3) * 0.015);
    const city = Array.from({ length: 26 }, (_, i) => ({ x: 0.36 + i * 0.011, hh: 0.04 + ((i * 37) % 11) / 110 + (i === 12 ? 0.11 : 0), spire: i % 4 === 0 || i === 12 }));
    const windows = city.flatMap((b, i) => Array.from({ length: 3 }, (_, k) => ({ b: i, k, ph: Math.random() * 6 })));
    const resize = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); w = window.innerWidth; h = window.innerHeight; c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px"; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    let last = performance.now(), T = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
      // sky
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#0e0b0a"); sky.addColorStop(0.6, "#1c1210"); sky.addColorStop(1, "#140e0c");
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      // blood moon
      const mx = w * 0.72, my = h * 0.24, mr = Math.min(w, h) * 0.07;
      const mg = g.createRadialGradient(mx, my, mr * 0.3, mx, my, mr * 4); mg.addColorStop(0, "rgba(190,60,40,0.35)"); mg.addColorStop(1, "rgba(190,60,40,0)");
      g.fillStyle = mg; g.fillRect(0, 0, w, h);
      g.fillStyle = "#7a2a20"; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
      // lightning flash
      nextFlash -= dt; if (nextFlash <= 0 && !reduce) { flash = 1; nextFlash = 6 + Math.random() * 9; }
      if (flash > 0) { g.fillStyle = `rgba(220,200,255,${flash * 0.12})`; g.fillRect(0, 0, w, h); flash = Math.max(0, flash - dt * 2.5); }
      // far mountains
      g.fillStyle = "#1a1312"; g.beginPath(); g.moveTo(0, h);
      for (let i = 0; i <= 20; i++) g.lineTo((i / 20) * w, h * (0.6 + Math.sin(i * 1.7) * 0.05 + Math.sin(i * 0.6) * 0.04));
      g.lineTo(w, h); g.fill();
      // citadel
      g.fillStyle = "#0d0a09";
      for (const b of city) { const x = b.x * w, bw = w * 0.012, top = h * (0.7 - b.hh); g.fillRect(x, top, bw, h * 0.1 + h * b.hh); if (b.spire) { g.beginPath(); g.moveTo(x - 2, top); g.lineTo(x + bw / 2, top - h * 0.04); g.lineTo(x + bw + 2, top); g.fill(); } }
      for (const wi of windows) { const b = city[wi.b]!; const a = 0.35 + Math.sin(T * 2 + wi.ph) * 0.25; g.fillStyle = `rgba(232,160,70,${a})`; g.fillRect(b.x * w + w * 0.004, h * (0.7 - b.hh) + h * 0.015 + wi.k * h * 0.02, 2, 3); }
      // near ridge
      g.fillStyle = "#090706"; g.beginPath(); g.moveTo(0, h);
      ridge.forEach((r, i) => g.lineTo((i / (ridge.length - 1)) * w, h * r));
      g.lineTo(w, h); g.fill();
      // fog bands
      for (let i = 0; i < 4; i++) {
        const y = h * (0.66 + i * 0.07), off = ((T * (8 + i * 4)) % (w * 1.5)) - w * 0.25;
        for (let k = -1; k < 2; k++) { const fx = off + k * w * 0.75; const fg = g.createRadialGradient(fx, y, 0, fx, y, w * 0.35); fg.addColorStop(0, `rgba(120,95,85,${0.07 - i * 0.012})`); fg.addColorStop(1, "rgba(120,95,85,0)"); g.fillStyle = fg; g.fillRect(fx - w * 0.35, y - h * 0.2, w * 0.7, h * 0.4); }
      }
      // embers
      g.globalCompositeOperation = "lighter";
      for (const e of embers) {
        if (!reduce) { e.y -= e.v * dt; e.x += Math.sin(T + e.ph) * 0.0004; if (e.y < -0.02) { e.y = 1.02; e.x = Math.random(); } }
        const a = 0.5 + Math.sin(T * 3 + e.ph) * 0.4;
        g.fillStyle = `rgba(255,${130 + Math.round(e.ph * 15)},60,${a * (0.3 + e.y * 0.7)})`; g.fillRect(e.x * w, e.y * h, e.s, e.s);
      }
      g.globalCompositeOperation = "source-over";
      // vignette
      const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.65)");
      g.fillStyle = v; g.fillRect(0, 0, w, h);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };
    const onVis = () => { if (!document.hidden) { last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); } };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
