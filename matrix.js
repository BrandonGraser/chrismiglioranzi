// ── Matrix rain background (digits, white, per-cell brightness grid) ──
// Exposes window.startMatrix() so both the public site and the admin panel
// can boot the exact same effect after their markup is in place.
window.startMatrix = function startMatrix() {
    const canvas = document.getElementById('matrix-rain');
    if (!canvas || canvas.dataset.running) return;
    canvas.dataset.running = '1';

    const ctx = canvas.getContext('2d');
    const digits = '0123456789';
    const fadeMs = 900;      // time for a passed streak to fade out
    const minBright = 0.04;  // below this a cell is fully cleared (no ghosting)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width, height, fontSize, minFrameMs, cols, rows, bright, glyph, heads, intervals, nextTick;

    function setup() {
        width = window.innerWidth;
        height = window.innerHeight;
        const mobile = width <= 640;
        fontSize = mobile ? 18 : 14;    // fewer, larger cells on mobile
        minFrameMs = mobile ? 32 : 0;   // cap mobile to ~30fps
        canvas.width = width;
        canvas.height = height;
        cols = Math.ceil(width / fontSize);
        rows = Math.ceil(height / fontSize) + 1;
        bright = new Float32Array(cols * rows);   // per-cell brightness 0..1
        glyph = new Uint8Array(cols * rows);      // per-cell digit, held while it fades
        heads = [];
        intervals = [];
        nextTick = [];
        for (let i = 0; i < cols; i++) {
            heads[i] = Math.floor(Math.random() * -rows);   // start above the top
            intervals[i] = 45 + Math.random() * 70;         // each column its own speed
            nextTick[i] = 0;
        }
    }

    let lastFrame = 0;
    function loop(now) {
        requestAnimationFrame(loop);
        if (lastFrame && now - lastFrame < minFrameMs) return;
        const dt = lastFrame ? now - lastFrame : 16;
        lastFrame = now;

        // decay every cell toward zero, snapping small values to a hard 0
        const decay = Math.pow(minBright, dt / fadeMs);
        for (let k = 0; k < bright.length; k++) {
            if (bright[k] === 0) continue;
            bright[k] *= decay;
            if (bright[k] < minBright) bright[k] = 0;
        }

        // advance each column's head at its own pace, lighting a fresh cell
        for (let i = 0; i < cols; i++) {
            if (now < nextTick[i]) continue;
            nextTick[i] = now + intervals[i];
            heads[i]++;
            if (heads[i] >= rows) {
                if (Math.random() > 0.5) heads[i] = 0; else continue;
            }
            if (heads[i] >= 0) {
                const k = heads[i] * cols + i;
                bright[k] = 1;
                glyph[k] = Math.floor(Math.random() * 10);
            }
        }

        // redraw from scratch — overwrite, never accumulate
        ctx.clearRect(0, 0, width, height);
        ctx.font = `${fontSize}px 'JetBrains Mono', ui-monospace, monospace`;
        ctx.textBaseline = 'top';
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                const v = bright[j * cols + i];
                if (v === 0) continue;
                ctx.fillStyle = `rgba(240, 240, 245, ${(v * 0.85).toFixed(3)})`;
                ctx.fillText(digits[glyph[j * cols + i]], i * fontSize, j * fontSize);
            }
        }
    }

    setup();
    window.addEventListener('resize', setup);
    if (reduceMotion) {
        // single dense static pass, no animation
        ctx.font = `${fontSize}px 'JetBrains Mono', ui-monospace, monospace`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(220, 220, 228, 0.18)';
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                if (Math.random() > 0.55) {
                    ctx.fillText(digits[Math.floor(Math.random() * 10)], i * fontSize, j * fontSize);
                }
            }
        }
    } else {
        requestAnimationFrame(loop);
    }
};
