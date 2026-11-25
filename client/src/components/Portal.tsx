import { useEffect, useRef } from "react";

type P = [number, number];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * El logo, llevado al infinito: cada triángulo lleva otro inscrito y girado dentro,
 * igual que el triángulo interior de la marca. Al animar el giro aparece una espiral.
 */
export function Portal({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let w = 0;
    let h = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let ink = "#fff";
    let violet = "#a274ff";

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      ink = cs.getPropertyValue("--ink").trim();
      violet = cs.getPropertyValue("--violet").trim();
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const tri = (a: P, b: P, c: P) => {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.closePath();
      ctx.stroke();
    };
    const whirl = (a: P, b: P, c: P, t: number, depth: number, color: string, alpha: number) => {
      ctx.strokeStyle = color;
      for (let i = 0; i < depth; i++) {
        ctx.globalAlpha = alpha * (1 - i / depth) ** 1.15;
        [a, b, c] = [lerp(a, b, t), lerp(b, c, t), lerp(c, a, t)];
        tri(a, b, c);
      }
    };

    const draw = (ms: number) => {
      const time = ms / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      ctx.clearRect(0, 0, w, h);

      const side = Math.min(w * 0.96, (h * 0.94) / 0.866);
      const height = side * 0.866;
      const cx = w / 2 + pointer.x * 10;
      const top = (h - height) / 2 + pointer.y * 8;
      const A: P = [cx, top];
      const B: P = [cx - side / 2, top + height];
      const C: P = [cx + side / 2, top + height];
      const m1 = lerp(A, B, 0.5);
      const m2 = lerp(A, C, 0.5);
      const m3 = lerp(B, C, 0.5);

      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(1, side / 420);
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.95;
      tri(A, B, C);
      tri(m1, m2, m3);

      // 0.63 es el giro exacto del logo; la espiral respira alrededor de ese valor.
      const t = reduce ? 0.63 : 0.76 + 0.17 * Math.sin(time * 0.32) + pointer.x * 0.035;
      ctx.lineWidth = Math.max(0.8, side / 620);
      whirl(m1, m2, m3, t, 46, violet, 1);
      const t2 = reduce ? 0.5 : 0.14 + 0.07 * Math.sin(time * 0.21 + 2);
      whirl(A, m2, m1, t2, 14, ink, 0.3);
      whirl(m1, m3, B, t2, 14, ink, 0.3);
      whirl(m2, C, m3, t2, 14, ink, 0.3);
      ctx.globalAlpha = 1;
    };

    const loop = (ms: number) => {
      draw(ms);
      if (visible && !reduce) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    };
    const onTheme = () => {
      readColors();
      start();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start();
    });
    const ro = new ResizeObserver(() => {
      resize();
      start();
    });

    readColors();
    resize();
    start();
    io.observe(canvas);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("aether-theme", onTheme);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("aether-theme", onTheme);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
