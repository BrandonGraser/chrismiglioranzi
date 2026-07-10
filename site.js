// ── Public site boot ──
(async () => {
    window.startMatrix();

    // Apply any saved text overrides before animating the stats.
    const data = await window.SiteContent.fetchOverrides();
    window.SiteContent.applyView(data);

    // ── Number ticker (adapted from MagicUI NumberTicker) ──
    const formatter = new Intl.NumberFormat('en-US');
    const stats = document.querySelectorAll('[data-stat]');
    let started = false;

    function springTo(el, prefix, target, suffix) {
        // Critically-damped-ish spring matching MagicUI's damping: 60, stiffness: 100
        let value = 0;
        let velocity = 0;
        const stiffness = 100;
        const damping = 26;
        let last = performance.now();

        function step(now) {
            const dt = Math.min((now - last) / 1000, 0.064);
            last = now;
            const accel = stiffness * (target - value) - damping * velocity;
            velocity += accel * dt;
            value += velocity * dt;
            if (Math.abs(target - value) < 0.5 && Math.abs(velocity) < 0.5) {
                el.textContent = prefix + formatter.format(target) + suffix;
                return;
            }
            el.textContent = prefix + formatter.format(Math.round(value)) + suffix;
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function start() {
        if (started) return;
        started = true;
        stats.forEach((el) => {
            const { prefix, number, suffix } = window.SiteContent.parseStat(el.textContent);
            if (number == null) return;        // non-numeric value: leave as-is
            el.textContent = prefix + '0' + suffix;
            springTo(el, prefix, number, suffix);
        });
    }

    const statsRow = document.querySelector('.stats');
    if (statsRow) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) start();
        }, { threshold: 0.5 });
        observer.observe(statsRow);
    }
})();
