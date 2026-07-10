// ── Shared content model ──
// Single source of truth for every editable field. Used by both the public
// site (to apply saved overrides) and the admin panel (to edit + save them).
window.SiteContent = (function () {
    // Each field maps a storage key to an element (via data-edit) and a type:
    //   text  → plain textContent
    //   html  → innerHTML (bio keeps its <strong> emphasis)
    //   stat  → "100B+" style value; animated on the public site
    //   email → visible text + derived mailto: href on the wrapping <a>
    const FIELDS = [
        { key: 'nameFirst', type: 'text' },
        { key: 'nameLast', type: 'text' },
        { key: 'bio', type: 'html' },
        { key: 'stat1Value', type: 'stat' },
        { key: 'stat1Label', type: 'text' },
        { key: 'stat2Value', type: 'stat' },
        { key: 'stat2Label', type: 'text' },
        { key: 'stat3Value', type: 'stat' },
        { key: 'stat3Label', type: 'text' },
        { key: 'email', type: 'email' },
    ];

    const el = (key) => document.querySelector(`[data-edit="${key}"]`);

    // Split "100B+" / "$50M+" / "200+" into prefix, number and suffix.
    function parseStat(raw) {
        const m = String(raw).match(/^(\D*?)([\d,]+)(.*)$/s);
        if (!m) return { prefix: '', number: null, suffix: String(raw) };
        return { prefix: m[1], number: parseInt(m[2].replace(/,/g, ''), 10), suffix: m[3] };
    }

    async function fetchOverrides() {
        try {
            const res = await fetch('/api/content', { cache: 'no-store' });
            if (!res.ok) return {};
            return (await res.json()) || {};
        } catch (_) {
            return {};
        }
    }

    // Write a saved value into the DOM. `animate` is only true on the public site.
    function setField(field, value) {
        const node = el(field.key);
        if (!node || value == null) return;
        if (field.type === 'html') {
            node.innerHTML = value;
        } else if (field.type === 'email') {
            node.textContent = value;
            const anchor = node.closest('a');
            if (anchor) anchor.href = 'mailto:' + value;
        } else {
            // text + stat both land as plain text here; stats are animated separately
            node.textContent = value;
        }
    }

    // Apply overrides for the public site (no editing chrome).
    function applyView(data) {
        FIELDS.forEach((f) => {
            if (Object.prototype.hasOwnProperty.call(data, f.key)) setField(f, data[f.key]);
        });
    }

    // Apply overrides for the admin panel (identical text; stats shown static).
    function applyEdit(data) {
        applyView(data);
    }

    // Read the current DOM back into a plain object for saving.
    function collect() {
        const out = {};
        FIELDS.forEach((f) => {
            const node = el(f.key);
            if (!node) return;
            out[f.key] = f.type === 'html' ? node.innerHTML.trim() : node.textContent.trim();
        });
        return out;
    }

    return { FIELDS, parseStat, fetchOverrides, applyView, applyEdit, collect, el };
})();
