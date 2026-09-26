// UFI-TOOLS RE sidebar navigation (layout only, no business logic)
(() => {
    const body = document.body
    const mainCol = () => document.getElementById('mainCol')
    const isMobile = () => window.matchMedia('(max-width: 820px)').matches

    // ---- view switching ----
    const setView = (view) => {
        const col = mainCol()
        if (col) {
            col.querySelectorAll('[data-view]').forEach(el => {
                if (el.dataset.view === view) el.classList.remove('view-hidden')
                else el.classList.add('view-hidden')
            })
        }
        document.querySelectorAll('[data-kano-plugin-page]').forEach(el => {
            el.classList.add('view-hidden')
        })
        document.querySelectorAll('#sidebarNav .nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.view === view)
        })
        document.querySelectorAll('#sidebarPluginList .nav-item').forEach(b => {
            b.classList.remove('active')
        })
        try { localStorage.setItem('kano_sidebar_view', view) } catch (e) { }
        body.classList.remove('sidebar-open')
    }

    // ---- plugin pages ----
    // 约定：插件可在 window.kanoPluginPages = { 插件名: fn } 注册打开逻辑，
    // 或在页面中放置 [data-kano-plugin-page="插件名"] 容器作为插件页
    const openPlugin = (name) => {
        const pages = window.kanoPluginPages
        if (pages && typeof pages[name] === 'function') {
            try { pages[name](); body.classList.remove('sidebar-open'); return } catch (e) { console.error(e) }
        }
        const el = document.querySelector(`[data-kano-plugin-page="${(window.CSS && CSS.escape) ? CSS.escape(name) : name}"]`)
        if (el) {
            const col = mainCol()
            if (col) col.querySelectorAll('[data-view]').forEach(s => s.classList.add('view-hidden'))
            document.querySelectorAll('[data-kano-plugin-page]').forEach(x => x.classList.add('view-hidden'))
            el.style.display = ''
            el.classList.remove('view-hidden')
            document.querySelectorAll('#sidebarPluginList .nav-item').forEach(b => {
                b.classList.toggle('active', b.dataset.plugin === name)
            })
            try { localStorage.setItem('kano_sidebar_view', 'plugin:' + name) } catch (e) { }
            body.classList.remove('sidebar-open')
            return
        }
        if (typeof createToast === 'function') createToast(typeof t === 'function' ? t('plugin_no_page') : 'no dedicated page')
        body.classList.remove('sidebar-open')
    }

    // ---- plugin list (order follows plugin management) ----
    const buildPluginList = (list) => {
        const ul = document.getElementById('sidebarPluginList')
        if (!ul) return
        ul.innerHTML = ''
        list.forEach(p => {
            const li = document.createElement('li')
            const b = document.createElement('button')
            b.className = 'nav-item plugin-item'
            b.dataset.plugin = p.name
            b.textContent = p.name
            if (p.disabed) {
                b.style.opacity = '.5'
                b.style.textDecoration = 'line-through'
            }
            b.onclick = () => openPlugin(p.name)
            li.appendChild(b)
            ul.appendChild(li)
        })
    }
    window.onPluginListChanged = (list) => buildPluginList(list || [])

    const loadPlugins = () => {
        try {
            if (typeof getCustomHead !== 'function') return
            getCustomHead().then((text) => {
                const regex = /<!--\s*\[KANO_PLUGIN_START\]\s*(.*?)\s*-->([\s\S]*?)<!--\s*\[KANO_PLUGIN_END\]\s*\1\s*-->/g
                const list = []
                let m
                while ((m = regex.exec(text || '')) !== null) {
                    const name = m[1].trim()
                    const content = m[2].trim()
                    list.push({ name, disabed: content.includes('[kano_disabled]') })
                }
                buildPluginList(list)
            }).catch(() => { })
        } catch (e) { console.error(e) }
    }
    loadPlugins()

    // ---- nav clicks ----
    document.querySelectorAll('#sidebarNav .nav-item').forEach(b => {
        b.addEventListener('click', () => setView(b.dataset.view))
    })

    // ---- drawer toggles ----
    const toggleBtn = document.getElementById('sidebarToggleBtn')
    if (toggleBtn) toggleBtn.addEventListener('click', () => {
        if (isMobile()) body.classList.toggle('sidebar-open')
        else body.classList.toggle('sidebar-hidden')
    })
    const closeBtn = document.getElementById('sidebarCloseBtn')
    if (closeBtn) closeBtn.addEventListener('click', () => body.classList.remove('sidebar-open'))
    const scrim = document.getElementById('sidebarScrim')
    if (scrim) scrim.addEventListener('click', () => body.classList.remove('sidebar-open'))

    // ---- TTYD nav item visibility follows #TTYD display ----
    const ttyd = document.getElementById('TTYD')
    const ttydLi = document.getElementById('nav_ttyd_li')
    if (ttyd && ttydLi) {
        const syncTTYD = () => {
            ttydLi.style.display = (ttyd.style.display === 'none') ? 'none' : ''
        }
        try {
            new MutationObserver(syncTTYD).observe(ttyd, { attributes: true, attributeFilter: ['style'] })
        } catch (e) { }
        syncTTYD()
    }

    // ---- initial view ----
    let saved = 'home'
    try { saved = localStorage.getItem('kano_sidebar_view') || 'home' } catch (e) { }
    if (saved.startsWith('plugin:')) {
        setView('home')
        openPlugin(saved.slice(7))
    } else {
        const valid = ['home', 'lkband', 'lkcell', 'ttyd'].includes(saved) ? saved : 'home'
        setView(valid)
    }
})()
