// ============================================================
// M3 (Material You) 色调引擎 — UFI-TOOLS RE
// 根据「色相 + 明暗模式」生成一组 Material Design 3 色彩角色，
// 写入 :root 的 --md-* 变量；style.css 只消费这些变量。
// 设置持久化在 localStorage（m3hue / m3mode）。
// ============================================================
(function () {
    const LS_HUE = 'm3hue';
    const LS_MODE = 'm3mode';

    // 预设色调（Material You 风格）
    const PRESETS = [
        210, // 蓝
        152, // 绿
        285, // 紫
        332, // 粉
        25,  // 橙
        62,  // 黄
        190, // 青
        355  // 红
    ];

    const normH = (h) => ((h % 360) + 360) % 360;
    const hsl = (h, s, l) => `hsl(${normH(h).toFixed(0)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;

    function currentHue() {
        const v = parseFloat(localStorage.getItem(LS_HUE));
        return isNaN(v) ? 210 : normH(v);
    }

    function currentMode() {
        return localStorage.getItem(LS_MODE) || 'auto';
    }

    function isDark() {
        const m = currentMode();
        if (m === 'dark') return true;
        if (m === 'light') return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 生成整套色彩角色并写入 CSS 变量
    function applyScheme() {
        const hue = currentHue();
        const dark = isDark();
        const s = document.documentElement.style;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

        // 派生色相
        const hSec = hue + 24;   // secondary 偏移
        const hTer = hue + 60;   // tertiary 偏移

        const roles = dark ? {
            'md-primary':              hsl(hue, 78, 80),
            'md-on-primary':           hsl(hue, 85, 18),
            'md-primary-container':    hsl(hue, 55, 28),
            'md-on-primary-container': hsl(hue, 85, 90),
            'md-secondary':            hsl(hSec, 30, 80),
            'md-on-secondary':         hsl(hSec, 35, 18),
            'md-secondary-container':  hsl(hSec, 26, 26),
            'md-on-secondary-container': hsl(hSec, 40, 90),
            'md-tertiary':             hsl(hTer, 65, 80),
            'md-tertiary-container':   hsl(hTer, 45, 28),
            'md-on-tertiary-container': hsl(hTer, 70, 90),
            'md-error':                hsl(0, 80, 78),
            'md-error-container':      hsl(0, 55, 28),
            'md-on-error-container':   hsl(0, 85, 92),
            'md-surface':              hsl(hue, 16, 8),
            'md-surface-dim':          hsl(hue, 16, 6),
            'md-surface-bright':       hsl(hue, 14, 22),
            'md-surface-container-lowest': hsl(hue, 18, 4),
            'md-surface-container-low':    hsl(hue, 15, 11),
            'md-surface-container':        hsl(hue, 14, 13),
            'md-surface-container-high':   hsl(hue, 13, 16),
            'md-surface-container-highest': hsl(hue, 12, 19),
            'md-on-surface':           hsl(hue, 12, 92),
            'md-on-surface-variant':   hsl(hue, 10, 76),
            'md-outline':              hsl(hue, 8, 58),
            'md-outline-variant':      hsl(hue, 10, 28),
            'md-inverse-surface':      hsl(hue, 12, 90),
            'md-inverse-on-surface':   hsl(hue, 14, 12),
            'md-inverse-primary':      hsl(hue, 70, 38),
            'md-scrim':                'rgba(0, 0, 0, 0.55)',
            'md-shadow':               'rgba(0, 0, 0, 0.45)',
            'md-glass-surface':         'hsl(' + normH(hue) + ' 16% 12% / 0.82)',
            'md-glass-scrim':           'hsl(' + normH(hue) + ' 20% 5% / 0.62)',
            'md-glass-card':            'hsl(' + normH(hue) + ' 15% 16% / 0.72)'
        } : {
            'md-primary':              hsl(hue, 72, 38),
            'md-on-primary':           'hsl(0 0% 100%)',
            'md-primary-container':    hsl(hue, 82, 91),
            'md-on-primary-container': hsl(hue, 75, 22),
            'md-secondary':            hsl(hSec, 32, 38),
            'md-on-secondary':         'hsl(0 0% 100%)',
            'md-secondary-container':  hsl(hSec, 52, 90),
            'md-on-secondary-container': hsl(hSec, 35, 20),
            'md-tertiary':             hsl(hTer, 60, 40),
            'md-tertiary-container':   hsl(hTer, 68, 90),
            'md-on-tertiary-container': hsl(hTer, 55, 22),
            'md-error':                hsl(0, 72, 45),
            'md-error-container':      hsl(0, 80, 92),
            'md-on-error-container':   hsl(0, 70, 24),
            'md-surface':              hsl(hue, 30, 98),
            'md-surface-dim':          hsl(hue, 20, 88),
            'md-surface-bright':       hsl(hue, 30, 99),
            'md-surface-container-lowest': 'hsl(0 0% 100%)',
            'md-surface-container-low':    hsl(hue, 28, 96),
            'md-surface-container':        hsl(hue, 25, 94),
            'md-surface-container-high':   hsl(hue, 22, 92),
            'md-surface-container-highest': hsl(hue, 20, 89),
            'md-on-surface':           hsl(hue, 22, 12),
            'md-on-surface-variant':   hsl(hue, 12, 34),
            'md-outline':              hsl(hue, 10, 48),
            'md-outline-variant':      hsl(hue, 18, 80),
            'md-inverse-surface':      hsl(hue, 14, 18),
            'md-inverse-on-surface':   hsl(hue, 16, 94),
            'md-inverse-primary':      hsl(hue, 75, 82),
            'md-scrim':                'rgba(0, 0, 0, 0.35)',
            'md-shadow':               'rgba(0, 0, 0, 0.15)',
            'md-glass-surface':         'hsl(' + normH(hue) + ' 30% 99% / 0.85)',
            'md-glass-scrim':           'hsl(' + normH(hue) + ' 30% 30% / 0.42)',
            'md-glass-card':            'hsl(' + normH(hue) + ' 30% 100% / 0.78)'
        };

        Object.keys(roles).forEach((k) => s.setProperty('--' + k, roles[k]));

        // 旧版变量别名（HTML 内联样式与遗留逻辑仍在使用）
        s.setProperty('--dark-btn-color', 'var(--md-secondary-container)');
        s.setProperty('--dark-btn-color-active', 'var(--md-primary)');
        s.setProperty('--dark-btn-disabled-color', 'var(--md-surface-container-high)');
        s.setProperty('--dark-tag-color', 'var(--md-secondary-container)');
        s.setProperty('--dark-tag-color-active', 'var(--md-primary)');
        s.setProperty('--dark-title-color', 'var(--md-primary)');
        s.setProperty('--dark-card-bg', 'var(--md-surface-container)');
        // 字体颜色：用户在主题设置里自定义过则保留自定义值（theme.js 管理）
        if (localStorage.getItem('textColorCustom') !== 'true') {
            s.setProperty('--dark-text-color', 'var(--md-on-surface)');
        }

        // 同步色板 UI
        const hueEl = document.querySelector('#schemeHueEl');
        if (hueEl) hueEl.value = String(Math.round(hue));
        const hueVal = document.querySelector('#schemeHueValue');
        if (hueVal) hueVal.innerText = Math.round(hue) + '°';
        document.querySelectorAll('.scheme-presets .swatch')?.forEach((el) => {
            el.classList.toggle('active', Math.round(hue) === Math.round(parseFloat(el.dataset.hue)));
        });
        document.querySelectorAll('.scheme-mode .seg-btn')?.forEach((el) => {
            el.classList.toggle('active', el.dataset.mode === currentMode());
        });
    }

    // ---- 对外事件处理 ----
    function setSchemeHue(e) {
        localStorage.setItem(LS_HUE, e.target.value);
        applyScheme();
    }

    function setSchemeMode(e) {
        const mode = e.target.dataset && e.target.dataset.mode
            ? e.target.dataset.mode
            : (e.target.value || 'auto');
        localStorage.setItem(LS_MODE, mode);
        applyScheme();
    }

    function applySchemePreset(hue) {
        localStorage.setItem(LS_HUE, hue);
        applyScheme();
    }

    // 系统主题变化时（auto 模式）自动跟随
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
            if (currentMode() === 'auto') applyScheme();
        });
    }

    window.setSchemeHue = setSchemeHue;
    window.setSchemeMode = setSchemeMode;
    window.applySchemePreset = applySchemePreset;
    window.applyScheme = applyScheme;

    applyScheme();
})();
