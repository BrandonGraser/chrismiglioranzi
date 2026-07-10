// ── Admin panel controller ──
(() => {
    const overlay = document.getElementById('login-overlay');
    const form = document.getElementById('login-form');
    const input = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit');
    const errorEl = document.getElementById('login-error');
    const stage = document.getElementById('stage');
    const bar = document.getElementById('admin-bar');
    const publishBtn = document.getElementById('publish-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const statusEl = document.getElementById('admin-status');

    let baseline = '';   // JSON snapshot of the last-saved content
    let booted = false;

    // ── Auth ─────────────────────────────────────────────────────────────
    async function checkSession() {
        try {
            const res = await fetch('/api/session', { cache: 'no-store' });
            if (!res.ok) return false;
            const { authed } = await res.json();
            return !!authed;
        } catch (_) {
            return false;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: input.value }),
            });
            if (res.ok) {
                input.value = '';
                await boot();
                overlay.hidden = true;
            } else if (res.status === 401) {
                errorEl.textContent = 'Incorrect password.';
            } else {
                const msg = await res.text();
                errorEl.textContent = msg || 'Login is not configured yet.';
            }
        } catch (_) {
            errorEl.textContent = 'Network error. Try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign in';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try { await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
        location.reload();
    });

    // ── Editor ───────────────────────────────────────────────────────────
    async function injectHero() {
        // Pull the exact hero markup from the live public page so the admin
        // view is always 1:1 with the site (single source of truth).
        const res = await fetch('/', { cache: 'no-store' });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const hero = doc.querySelector('.hero');
        stage.innerHTML = '';
        stage.appendChild(document.importNode(hero, true));
    }

    function markDirty() {
        const changed = JSON.stringify(window.SiteContent.collect()) !== baseline;
        publishBtn.disabled = !changed;
        statusEl.textContent = changed ? 'Unsaved changes' : '';
    }

    function enableEditing() {
        document.body.classList.add('admin-ready');

        stage.querySelectorAll('[data-edit]').forEach((elm) => {
            const isBio = elm.getAttribute('data-edit') === 'bio';

            elm.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (elm.getAttribute('contenteditable') === 'true') return;
                elm.setAttribute('contenteditable', 'true');
                elm.focus();
            });

            elm.addEventListener('input', markDirty);

            elm.addEventListener('blur', () => {
                elm.removeAttribute('contenteditable');
                markDirty();
            });

            // single-line fields: Enter commits instead of inserting a newline
            if (!isBio) {
                elm.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); elm.blur(); }
                });
            }
        });

        // never follow the email link while editing
        stage.querySelectorAll('a').forEach((a) => {
            a.addEventListener('click', (e) => e.preventDefault());
        });
    }

    publishBtn.addEventListener('click', async () => {
        publishBtn.disabled = true;
        statusEl.textContent = 'Publishing…';
        try {
            const payload = window.SiteContent.collect();
            const res = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                baseline = JSON.stringify(payload);
                statusEl.textContent = 'Published ✓';
                setTimeout(() => { if (statusEl.textContent === 'Published ✓') statusEl.textContent = ''; }, 2500);
            } else if (res.status === 401) {
                statusEl.textContent = 'Session expired — reload';
            } else {
                statusEl.textContent = (await res.text()) || 'Save failed';
                publishBtn.disabled = false;
            }
        } catch (_) {
            statusEl.textContent = 'Network error';
            publishBtn.disabled = false;
        }
    });

    async function boot() {
        if (booted) return;
        booted = true;
        await injectHero();
        window.startMatrix();
        const data = await window.SiteContent.fetchOverrides();
        window.SiteContent.applyEdit(data);
        baseline = JSON.stringify(window.SiteContent.collect());
        enableEditing();
        bar.hidden = false;
        publishBtn.disabled = true;
    }

    // Local-only hook for previewing the editor UI without the live API.
    // Never exposed on the deployed site.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        window.__adminBoot = boot;
    }

    // ── Start ────────────────────────────────────────────────────────────
    (async () => {
        if (await checkSession()) {
            await boot();
            overlay.hidden = true;
        } else {
            overlay.hidden = false;
            input.focus();
        }
    })();
})();
