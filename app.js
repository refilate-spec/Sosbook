(() => {
  "use strict";

  const DATA = window.STORE_DATA;
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const app = $("#app");
  const STORAGE = {
    saved: "novastore_saved_v1",
    liked: "novastore_liked_v1",
    recent: "novastore_recent_v1",
    theme: "novastore_theme_v1"
  };

  const state = {
    query: "",
    category: "all",
    sort: "featured",
    view: "grid",
    filtersOpen: false,
    searchOpen: false
  };

  const safeJSON = (key, fallback=[]) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const getSaved = () => safeJSON(STORAGE.saved);
  const getLiked = () => safeJSON(STORAGE.liked);
  const getRecent = () => safeJSON(STORAGE.recent);

  const persist = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function esc(v="") {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function slugify(v="") {
    return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  }
  function bySlug(slug) { return DATA.products.find(p => p.slug === slug); }
  function cat(slug) { return DATA.categories.find(c => c.slug === slug); }
  function getParam(name) { return new URLSearchParams(location.search).get(name) || ""; }
  function urlFor(path) { return path; }

  function navigate(path) {
    history.pushState({}, "", path);
    window.scrollTo({top:0, behavior:"instant"});
    render();
  }
  window.addEventListener("popstate", render);

  function route() {
    const p = location.pathname.replace(/\/+$/,"") || "/";
    return { p };
  }

  function setMeta({title,description,url,robots="index,follow"}) {
    document.title = title || DATA.site.name;
    const meta = (name, content, prop=false) => {
      let el = document.head.querySelector(`${prop?'meta[property':'meta[name'}="${name}"]`);
      if (!el) { el=document.createElement("meta"); el.setAttribute(prop?"property":"name",name); document.head.appendChild(el); }
      el.setAttribute("content",content);
    };
    meta("description", description || DATA.site.tagline);
    meta("robots", robots);
    meta("og:title", document.title, true);
    meta("og:description", description || DATA.site.tagline, true);
    meta("og:type", "website", true);
    meta("og:url", url || location.href, true);
    meta("twitter:card", "summary_large_image");
    meta("twitter:title", document.title);
    meta("twitter:description", description || DATA.site.tagline);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical=document.createElement("link"); canonical.rel="canonical"; document.head.appendChild(canonical); }
    canonical.href = url || location.href;
  }

  function setJSONLD(obj) {
    let s = document.head.querySelector("#dynamic-jsonld");
    if (!s) { s=document.createElement("script"); s.id="dynamic-jsonld"; s.type="application/ld+json"; document.head.appendChild(s); }
    s.textContent = JSON.stringify(obj);
  }

  function themeInit() {
    const pref = localStorage.getItem(STORAGE.theme);
    const isDark = pref ? pref==="dark" : true;
    document.documentElement.classList.toggle("dark", isDark);
  }
  themeInit();

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle("dark");
    localStorage.setItem(STORAGE.theme, dark ? "dark":"light");
    render();
  }

  function iconFor(p) {
    return p.category==="games" ? "🎮" :
           p.category==="ai-tools" ? "✦" :
           p.category==="banks" ? "🏦" :
           p.category==="credit-cards" ? "💳" :
           p.category==="loans" ? "₹" :
           p.category==="investments" ? "📈" :
           p.category==="insurance" ? "🛡" :
           p.category==="shopping" ? "🛍" :
           p.category==="templates" ? "▦" :
           p.category==="ebooks" ? "📚" :
           p.category==="deals" ? "⚡" : "◈";
  }

  function categoryPill(slug) {
    const c = cat(slug);
    return c ? `<span class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">${c.icon} ${esc(c.name)}</span>` : "";
  }

  function header(active="") {
    const count = getSaved().length;
    return `
    <header class="sticky top-0 z-50 border-b border-white/10 bg-ink/75 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button class="focus-ring flex shrink-0 items-center gap-2" data-nav="/">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-lg font-black shadow-glow">N</span>
          <span class="hidden text-left sm:block">
            <span class="block text-sm font-black tracking-tight">NovaStore</span>
            <span class="block text-[10px] text-slate-500">Digital Discovery</span>
          </span>
        </button>

        <nav class="hidden items-center gap-1 lg:flex">
          <button data-nav="/explore" class="${active==="explore"?"bg-white/10 text-white":"text-slate-400"} rounded-xl px-3 py-2 text-sm hover:bg-white/5">Explore</button>
          <button data-nav="/saved" class="${active==="saved"?"bg-white/10 text-white":"text-slate-400"} rounded-xl px-3 py-2 text-sm hover:bg-white/5">Saved <span class="ml-1 rounded-full bg-blue-500/15 px-1.5 text-[10px] text-blue-300">${count}</span></button>
        </nav>

        <div class="mx-auto hidden max-w-xl flex-1 md:block">
          <div class="relative">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
            <input id="globalSearch" value="${esc(state.query)}" autocomplete="off" placeholder="Search apps, cards, loans, AI tools…" class="focus-ring w-full rounded-2xl border border-white/10 bg-white/[.045] py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-slate-600 focus:border-blue-400/40">
            <div id="searchSuggest" class="absolute left-0 right-0 top-[calc(100%+8px)] hidden overflow-hidden rounded-2xl border border-white/10 bg-[#0d1222]/95 p-2 shadow-2xl backdrop-blur-xl"></div>
          </div>
        </div>

        <button aria-label="Search" data-search-open class="focus-ring ml-auto grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg md:hidden">⌕</button>
        <button aria-label="Toggle theme" data-theme class="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">${document.documentElement.classList.contains("dark")?"☀":"◐"}</button>
      </div>
    </header>`;
  }

  function bottomNav(active="") {
    return `<nav class="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-around rounded-2xl border border-white/10 bg-[#0b1020]/90 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
      <button data-nav="/" class="focus-ring rounded-xl px-4 py-2 text-xs ${active==="home"?"bg-white/10 text-white":"text-slate-500"}">⌂<span class="mt-0.5 block">Home</span></button>
      <button data-nav="/explore" class="focus-ring rounded-xl px-4 py-2 text-xs ${active==="explore"?"bg-white/10 text-white":"text-slate-500"}">⌕<span class="mt-0.5 block">Explore</span></button>
      <button data-nav="/saved" class="focus-ring rounded-xl px-4 py-2 text-xs ${active==="saved"?"bg-white/10 text-white":"text-slate-500"}">♡<span class="mt-0.5 block">Saved</span></button>
      <button data-theme class="focus-ring rounded-xl px-4 py-2 text-xs text-slate-500">◐<span class="mt-0.5 block">Theme</span></button>
    </nav>`;
  }

  function footer() {
    return `<footer class="mt-16 border-t border-white/10">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div><div class="text-lg font-black">NovaStore</div><p class="mt-2 text-sm leading-6 text-slate-500">${esc(DATA.site.tagline)}</p></div>
        <div><div class="text-sm font-semibold text-white">Popular</div><div class="mt-3 space-y-2 text-sm text-slate-500">
          <button data-nav="/category/ai-tools" class="block hover:text-white">AI Tools</button>
          <button data-nav="/category/apps" class="block hover:text-white">Apps</button>
          <button data-nav="/category/software" class="block hover:text-white">Software</button></div></div>
        <div><div class="text-sm font-semibold text-white">Finance</div><div class="mt-3 space-y-2 text-sm text-slate-500">
          <button data-nav="/category/banks" class="block hover:text-white">Banks</button>
          <button data-nav="/category/credit-cards" class="block hover:text-white">Credit Cards</button>
          <button data-nav="/category/loans" class="block hover:text-white">Loans</button></div></div>
        <div><div class="text-sm font-semibold text-white">Note</div><p class="mt-3 text-xs leading-5 text-slate-600">Financial content is for discovery and general information, not financial advice. Confirm current rates, fees, eligibility and terms with the provider.</p></div>
      </div>
      <div class="border-t border-white/5 py-5 text-center text-xs text-slate-600">© ${new Date().getFullYear()} NovaStore. Independent discovery platform.</div>
    </footer>`;
  }

  function categoryRail() {
    return `<div class="hide-scrollbar flex gap-2 overflow-x-auto py-1">
      <button data-cat="all" class="shrink-0 rounded-full border border-white/10 ${state.category==="all"?"bg-white text-slate-950":"bg-white/5 text-slate-300"} px-4 py-2 text-xs font-semibold">All</button>
      ${DATA.categories.map(c => `<button data-cat="${c.slug}" class="shrink-0 rounded-full border border-white/10 ${state.category===c.slug?"bg-white text-slate-950":"bg-white/5 text-slate-300"} px-4 py-2 text-xs font-semibold">${c.icon} ${esc(c.name)}</button>`).join("")}
    </div>`;
  }

  function searchInputModal() {
    return `<div id="searchOverlay" class="fixed inset-0 z-[70] hidden bg-black/70 p-4 backdrop-blur-sm">
      <div class="mx-auto mt-14 max-w-2xl pop-in rounded-3xl border border-white/10 bg-[#0d1222] p-3 shadow-2xl">
        <div class="flex items-center gap-2">
          <span class="pl-2 text-slate-500">⌕</span>
          <input id="mobileSearch" autofocus placeholder="Search anything…" class="focus-ring w-full bg-transparent p-3 text-lg outline-none placeholder:text-slate-600">
          <button data-search-close class="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-400">Esc</button>
        </div>
        <div id="mobileSuggest" class="mt-2"></div>
      </div>
    </div>`;
  }

  function quickSmart(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const direct = [];
    const map = [
      ["credit","credit-cards"],["card","credit-cards"],["loan","loans"],["borrow","loans"],
      ["bank","banks"],["invest","investments"],["stock","investments"],["mutual","investments"],
      ["insurance","insurance"],["ai","ai-tools"],["artificial intelligence","ai-tools"],
      ["game","games"],["gaming","games"],["template","templates"],["ebook","ebooks"],
      ["book","ebooks"],["shop","shopping"],["deal","deals"],["hosting","services"]
    ];
    for (const [needle, slug] of map) if (q.includes(needle)) direct.push(cat(slug));
    return direct.filter(Boolean).slice(0,3);
  }

  function smartSuggestions(query, limit=5) {
    const q=query.toLowerCase().trim();
    if (!q) return [];
    return DATA.products
      .map(p => {
        const hay = [p.title,p.category,p.subcategory,p.short,p.description,...p.tags,...p.features].join(" ").toLowerCase();
        let score=0;
        for (const token of q.split(/\s+/)) if (hay.includes(token)) score += hay.includes(p.title.toLowerCase())?4:1;
        return {p,score};
      }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.p);
  }

  function productCard(p) {
    const saved = getSaved().includes(p.slug);
    const liked = getLiked().includes(p.slug);
    return `<article class="group glass glass-hover overflow-hidden rounded-3xl">
      <button data-nav="/product/${encodeURIComponent(p.slug)}" class="block w-full text-left">
        <div class="relative aspect-[16/10] overflow-hidden bg-slate-900">
          <img src="${esc(p.image)}" alt="" loading="lazy" class="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0d1222] via-transparent to-transparent"></div>
          <div class="absolute left-3 top-3 flex items-center gap-2">${p.badge?`<span class="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">${esc(p.badge)}</span>`:""}<span class="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] text-slate-300 backdrop-blur">${esc(p.price)}</span></div>
          <div class="absolute bottom-3 left-3 h-12 w-12 rounded-2xl border border-white/15 bg-black/45 p-2 text-2xl backdrop-blur">${iconFor(p)}</div>
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold tracking-tight">${esc(p.title)}</h3><div class="mt-1 flex items-center gap-2 text-xs text-slate-500">${categoryPill(p.category)} <span>★ ${p.rating.toFixed(1)}</span></div></div>
          </div>
          <p class="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">${esc(p.short)}</p>
        </div>
      </button>
      <div class="flex items-center justify-between border-t border-white/5 px-4 py-3">
        <button data-like="${esc(p.slug)}" class="rounded-xl px-3 py-2 text-xs ${liked?"bg-pink-500/10 text-pink-300":"bg-white/5 text-slate-500"}">${liked?"♥":"♡"} Like</button>
        <button data-save="${esc(p.slug)}" class="rounded-xl px-3 py-2 text-xs ${saved?"bg-blue-500/10 text-blue-300":"bg-white/5 text-slate-500"}">${saved?"✓ Saved":"＋ Save"}</button>
        <button data-share="${esc(p.slug)}" class="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-500">Share</button>
      </div>
    </article>`;
  }

  function productGrid(items, emptyText="No matching products.") {
    if (!items.length) return `<div class="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center"><div class="text-3xl">⌕</div><div class="mt-3 font-semibold">${esc(emptyText)}</div><div class="mt-1 text-sm text-slate-500">Try a broader keyword or choose another category.</div></div>`;
    return `<div class="${state.view==="list"?"grid gap-3":"grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}">${items.map(productCard).join("")}</div>`;
  }

  function filteredProducts() {
    let items = DATA.products.slice();
    if (state.category!=="all") items=items.filter(p=>p.category===state.category);
    if (state.query) {
      const q=state.query.toLowerCase();
      items=items.map(p=>{
        const hay=[p.title,p.category,p.subcategory,p.short,p.description,...p.tags,...p.features].join(" ").toLowerCase();
        let score=0;
        q.split(/\s+/).forEach(t=>{if(hay.includes(t)) score+=t===p.title.toLowerCase()?4:1;});
        return {...p,_score:score};
      }).filter(p=>p._score>0);
    }
    if (state.sort==="rating") items.sort((a,b)=>b.rating-a.rating);
    else if (state.sort==="az") items.sort((a,b)=>a.title.localeCompare(b.title));
    else if (state.sort==="za") items.sort((a,b)=>b.title.localeCompare(a.title));
    else if (state.sort==="category") items.sort((a,b)=>a.category.localeCompare(b.category)||a.title.localeCompare(b.title));
    else if (state.query) items.sort((a,b)=>(b._score||0)-(a._score||0));
    return items;
  }

  function home() {
    const featured=DATA.products.filter(p=>["ai-tools","apps","software","games"].includes(p.category)).slice(0,6);
    setMeta({title:`${DATA.site.name} — Digital Discovery Superstore`,description:DATA.site.tagline,url:location.href});
    setJSONLD({
      "@context":"https://schema.org","@type":"WebSite","name":DATA.site.name,"url":location.href,
      "potentialAction":{"@type":"SearchAction","target":location.origin+"/search?q={search_term_string}","query-input":"required name=search_term_string"}
    });
    return `${header("home")}
      <main>
        <section class="hero-grid relative overflow-hidden border-b border-white/10">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,.20),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,.16),transparent_35%)]"></div>
          <div class="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16 lg:pb-16">
            <div class="max-w-3xl">
              <span class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200">✦ One place. Many digital worlds.</span>
              <h1 class="mt-5 text-balance text-4xl font-black tracking-tight sm:text-6xl">Find the right <span class="bg-gradient-to-r from-blue-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">digital product</span> faster.</h1>
              <p class="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">${esc(DATA.site.tagline)} Search by problem, product type, category, feature or keyword.</p>
              <div class="mt-7 flex flex-col gap-3 sm:flex-row">
                <button data-nav="/explore" class="rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-950 shadow-glow">Explore everything →</button>
                <button data-nav="/category/ai-tools" class="rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white">Browse AI tools</button>
              </div>
            </div>
            <div class="mt-10">${categoryRail()}</div>
          </div>
        </section>

        <section class="mx-auto max-w-7xl px-4 pt-9 sm:px-6">
          <div class="grid gap-4 md:grid-cols-3">
            <div class="glass rounded-3xl p-5"><div class="text-xs text-slate-500">Discovery catalog</div><div class="mt-2 text-2xl font-black">${DATA.products.length}+</div><div class="mt-1 text-sm text-slate-500">curated digital destinations</div></div>
            <div class="glass rounded-3xl p-5"><div class="text-xs text-slate-500">Categories</div><div class="mt-2 text-2xl font-black">${DATA.categories.length}</div><div class="mt-1 text-sm text-slate-500">from apps to finance</div></div>
            <div class="glass rounded-3xl p-5"><div class="text-xs text-slate-500">Personal state</div><div class="mt-2 text-2xl font-black">${getSaved().length}</div><div class="mt-1 text-sm text-slate-500">items saved in this browser</div></div>
          </div>
        </section>

        <section class="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <div class="flex items-end justify-between gap-4"><div><div class="text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Curated now</div><h2 class="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Featured discoveries</h2></div><button data-nav="/explore" class="text-sm text-slate-500 hover:text-white">View all →</button></div>
          <div class="mt-6">${productGrid(featured)}</div>
        </section>

        <section class="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
          <div class="glass rounded-[2rem] p-6 sm:p-8">
            <div class="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
              <div><div class="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Smart Discover</div><h2 class="mt-2 text-2xl font-black">Search by intent, not just names.</h2><p class="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Try “loan”, “credit card”, “AI”, “gaming”, “design”, “hosting” or any product feature. Results combine title, category, tags, features and description signals.</p></div>
              <div class="flex flex-wrap gap-2">${["loan","credit card","AI writing","gaming","website hosting","templates"].map(q=>`<button data-query="${esc(q)}" class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10">${esc(q)}</button>`).join("")}</div>
            </div>
          </div>
        </section>
      </main>${footer()}${bottomNav("home")}${searchInputModal()}`;
  }

  function explore() {
    const items=filteredProducts();
    setMeta({title:`Explore — ${DATA.site.name}`,description:"Browse apps, games, AI tools, software, finance, deals and digital services.",url:location.href});
    setJSONLD({"@context":"https://schema.org","@type":"CollectionPage","name":"Explore","url":location.href});
    return `${header("explore")}
      <main class="mx-auto max-w-7xl px-4 pb-20 pt-7 sm:px-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div class="text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Discovery</div><h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Explore everything</h1><p class="mt-2 text-sm text-slate-500">Search, filter and sort the entire catalog.</p></div>
          <div class="flex flex-wrap items-center gap-2">
            <select id="sortSelect" class="focus-ring rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-300 outline-none">
              <option value="featured" ${state.sort==="featured"?"selected":""}>Featured</option><option value="rating" ${state.sort==="rating"?"selected":""}>Top rated</option><option value="az" ${state.sort==="az"?"selected":""}>A → Z</option><option value="za" ${state.sort==="za"?"selected":""}>Z → A</option><option value="category" ${state.sort==="category"?"selected":""}>Category</option>
            </select>
            <button data-view="grid" class="rounded-xl border border-white/10 px-3 py-2 text-xs ${state.view==="grid"?"bg-white text-slate-950":"bg-white/5 text-slate-400"}">Grid</button>
            <button data-view="list" class="rounded-xl border border-white/10 px-3 py-2 text-xs ${state.view==="list"?"bg-white text-slate-950":"bg-white/5 text-slate-400"}">List</button>
          </div>
        </div>
        <div class="mt-6">${categoryRail()}</div>
        <div class="mt-7 grid gap-7 lg:grid-cols-[220px_1fr]">
          <aside class="glass hidden h-max rounded-3xl p-4 lg:block">
            <div class="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Categories</div>
            <div class="mt-3 space-y-1">${DATA.categories.map(c=>`<button data-cat="${c.slug}" class="w-full rounded-xl px-3 py-2 text-left text-sm ${state.category===c.slug?"bg-blue-500/10 text-blue-200":"text-slate-400 hover:bg-white/5"}">${c.icon} ${esc(c.name)}</button>`).join("")}</div>
          </aside>
          <section><div class="mb-4 flex items-center justify-between"><span class="text-sm text-slate-500"><b class="text-slate-200">${items.length}</b> results${state.query?` for “${esc(state.query)}”`:""}</span>${state.query?`<button data-query="" class="text-xs text-blue-300">Clear search</button>`:""}</div>${productGrid(items)}</section>
        </div>
      </main>${footer()}${bottomNav("explore")}${searchInputModal()}`;
  }

  function searchPage() {
    state.query=getParam("q");
    return explore().replace("Explore everything","Search results").replace("Discovery","Search");
  }

  function saved() {
    const slugs=getSaved();
    const items=slugs.map(bySlug).filter(Boolean);
    setMeta({title:`Saved — ${DATA.site.name}`,description:"Your saved NovaStore discoveries.",url:location.href});
    return `${header("saved")}
      <main class="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <div class="flex items-end justify-between gap-4"><div><div class="text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Your shelf</div><h1 class="mt-2 text-3xl font-black">Saved items</h1><p class="mt-2 text-sm text-slate-500">Saved state lives in this browser.</p></div>${items.length?`<button data-clear-saved class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">Clear all</button>`:""}</div>
        <div class="mt-7">${productGrid(items,"Nothing saved yet.")}</div>
      </main>${footer()}${bottomNav("saved")}${searchInputModal()}`;
  }

  function categoryPage(slug) {
    const c=cat(slug);
    if(!c) return notFound();
    state.category=slug; state.query="";
    const items=filteredProducts();
    setMeta({title:`${c.name} — ${DATA.site.name}`,description:c.desc,url:location.href});
    setJSONLD({"@context":"https://schema.org","@type":"CollectionPage","name":c.name,"description":c.desc,"url":location.href});
    return `${header("explore")}
      <main class="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <div class="glass overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div class="text-4xl">${c.icon}</div><h1 class="mt-3 text-3xl font-black">${esc(c.name)}</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">${esc(c.desc)}</p></div><div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center"><div class="text-2xl font-black">${items.length}</div><div class="text-[11px] text-slate-500">discoveries</div></div></div>
        </div>
        <div class="mt-6">${categoryRail()}</div>
        <div class="mt-6">${productGrid(items)}</div>
      </main>${footer()}${bottomNav("explore")}${searchInputModal()}`;
  }

  function productPage(slug) {
    const p=bySlug(slug);
    if(!p) return notFound();
    const saved=getSaved().includes(slug), liked=getLiked().includes(slug);
    const related=DATA.products.filter(x=>x.slug!==slug && (x.category===p.category || x.tags.some(t=>p.tags.includes(t)))).slice(0,4);
    const crumbs=[{name:"Home",url:"/"},{name:cat(p.category)?.name||p.category,url:`/category/${p.category}`},{name:p.title,url:`/product/${p.slug}`}];
    setMeta({title:`${p.title} — ${DATA.site.name}`,description:p.short,url:location.href});
    setJSONLD([
      {"@context":"https://schema.org","@type":p.category==="apps"||p.category==="software"||p.category==="ai-tools"?"SoftwareApplication":"Product","name":p.title,"description":p.description,"url":location.href,"image":p.image,"aggregateRating":{"@type":"AggregateRating","ratingValue":p.rating,"ratingCount":100},"offers":{"@type":"Offer","price":String(p.price).replace(/[^\d.]/g,"")||"0","priceCurrency":"INR","url":p.url}},
      {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":crumbs.map((c,i)=>({"@type":"ListItem","position":i+1,"name":c.name,"item":location.origin+c.url}))}
    ]);
    pushRecent(slug);
    return `${header()}
      <main class="mx-auto max-w-7xl px-4 pb-20 pt-7 sm:px-6">
        <div class="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">${crumbs.map((c,i)=>`${i?"<span>›</span>":""}<button data-nav="${c.url}" class="hover:text-white">${esc(c.name)}</button>`).join("")}</div>
        <div class="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <div class="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5"><img src="${esc(p.image)}" alt="" class="h-full max-h-[520px] w-full object-cover"></div>
          <div class="glass rounded-[2rem] p-6 sm:p-8">
            <div class="flex flex-wrap items-center gap-2">${categoryPill(p.category)} ${p.badge?`<span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">${esc(p.badge)}</span>`:""}</div>
            <h1 class="mt-4 text-3xl font-black tracking-tight sm:text-5xl">${esc(p.title)}</h1>
            <p class="mt-4 text-base leading-7 text-slate-400">${esc(p.description)}</p>
            <div class="mt-5 flex flex-wrap gap-2">${p.features.map(f=>`<span class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">${esc(f)}</span>`).join("")}</div>
            <div class="mt-6 flex items-end justify-between gap-4 border-y border-white/10 py-5"><div><div class="text-2xl font-black">${esc(p.price)}</div><div class="mt-1 text-xs text-slate-500">Rating ★ ${p.rating.toFixed(1)} / 5</div></div><div class="text-right text-xs text-slate-500">External destination<br>Verify provider terms</div></div>
            <div class="mt-6 grid gap-2 sm:grid-cols-2">
              <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer nofollow" class="rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-bold text-slate-950">${esc(p.actionText)} ↗</a>
              <button data-save="${esc(p.slug)}" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold">${saved?"✓ Saved":"＋ Save"}</button>
              <button data-share="${esc(p.slug)}" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold">Share</button>
              <button data-like="${esc(p.slug)}" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold">${liked?"♥ Liked":"♡ Like"}</button>
            </div>
            ${p.financial?`<div class="mt-5 rounded-2xl border border-amber-300/10 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100/75"><b class="text-amber-200">Financial disclaimer:</b> This listing is for discovery and general information only, not financial advice or a guarantee of approval, return or suitability. Check the provider's current rates, fees, eligibility, exclusions and legal terms before applying or investing.</div>`:""}
          </div>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-2">
          <section class="glass rounded-3xl p-6"><h2 class="text-lg font-bold">Why consider it</h2><div class="mt-4 space-y-3">${p.pros.map(x=>`<div class="flex gap-3 text-sm text-slate-400"><span class="mt-0.5 text-emerald-300">✓</span><span>${esc(x)}</span></div>`).join("")}</div></section>
          <section class="glass rounded-3xl p-6"><h2 class="text-lg font-bold">Considerations</h2><div class="mt-4 space-y-3">${p.considerations.map(x=>`<div class="flex gap-3 text-sm text-slate-400"><span class="mt-0.5 text-amber-300">!</span><span>${esc(x)}</span></div>`).join("")}</div></section>
        </div>
        ${related.length?`<section class="pt-12"><div class="flex items-end justify-between"><div><div class="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">You may also like</div><h2 class="mt-2 text-2xl font-black">Related discoveries</h2></div></div><div class="mt-5">${productGrid(related)}</div></section>`:""}
      </main>${footer()}${bottomNav()}${searchInputModal()}`;
  }

  function notFound() {
    setMeta({title:`Not found — ${DATA.site.name}`,description:"The requested page was not found.",url:location.href,robots:"noindex,nofollow"});
    return `${header()}<main class="mx-auto max-w-2xl px-4 py-24 text-center"><div class="text-5xl">404</div><h1 class="mt-4 text-3xl font-black">This page moved.</h1><p class="mt-3 text-slate-500">The route or product could not be found.</p><button data-nav="/" class="mt-7 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950">Go home</button></main>${footer()}${searchInputModal()}`;
  }

  function pushRecent(slug) {
    let r=getRecent().filter(x=>x!==slug);
    r.unshift(slug); r=r.slice(0,20); persist(STORAGE.recent,r);
  }

  async function shareProduct(p) {
    const share={title:p.title,text:p.short,url:new URL(`/product/${p.slug}`,location.origin).href};
    try {
      if (navigator.share) await navigator.share(share);
      else {
        await navigator.clipboard.writeText(share.url);
        toast("Link copied");
      }
    } catch(e) {
      if(e && e.name!=="AbortError") toast("Share unavailable");
    }
  }

  function toggleList(key, slug) {
    let arr=key==="saved"?getSaved():getLiked();
    arr=arr.includes(slug)?arr.filter(x=>x!==slug):[...arr,slug];
    persist(key==="saved"?STORAGE.saved:STORAGE.liked,arr);
    toast(key==="saved"?(arr.includes(slug)?"Saved to your shelf":"Removed from saved"):(arr.includes(slug)?"Liked":"Like removed"));
    render(false);
  }

  function toast(msg) {
    let root=$("#toastRoot");
    if(!root){root=document.createElement("div");root.id="toastRoot";root.className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 lg:bottom-8";document.body.appendChild(root);}
    root.innerHTML=`<div class="toast rounded-2xl border border-white/10 bg-[#11172a]/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur">${esc(msg)}</div>`;
    clearTimeout(toast.t); toast.t=setTimeout(()=>root.innerHTML="",2200);
  }

  function render(resetQuery=true) {
    if (resetQuery && !location.pathname.startsWith("/search")) {
      if (location.pathname==="/explore") state.query="";
      if (location.pathname==="/") state.category="all";
    }
    const {p}=route();
    if(p==="/") app.innerHTML=home();
    else if(p==="/explore") app.innerHTML=explore();
    else if(p==="/saved") app.innerHTML=saved();
    else if(p==="/search") app.innerHTML=searchPage();
    else if(p.startsWith("/category/")) app.innerHTML=categoryPage(decodeURIComponent(p.split("/")[2]||""));
    else if(p.startsWith("/product/")) app.innerHTML=productPage(decodeURIComponent(p.split("/")[2]||""));
    else app.innerHTML=notFound();
    bind();
  }

  function renderSuggestions(input, box) {
    const q=input.value.trim();
    if(!q){box.classList.add("hidden");box.innerHTML="";return;}
    const cats=quickSmart(q), items=smartSuggestions(q,4);
    box.innerHTML=`${cats.length?`<div class="px-2 pb-2 text-[10px] uppercase tracking-[.16em] text-slate-600">Smart matches</div><div class="grid gap-1 sm:grid-cols-3">${cats.map(c=>`<button data-smart-cat="${c.slug}" class="rounded-xl bg-white/5 px-3 py-2 text-left text-xs text-slate-300">${c.icon} ${esc(c.name)}</button>`).join("")}</div>`:""}
      ${items.length?`<div class="mt-2 border-t border-white/5 pt-2">${items.map(p=>`<button data-nav="/product/${p.slug}" class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"><span class="grid h-8 w-8 place-items-center rounded-lg bg-white/5">${iconFor(p)}</span><span><span class="block text-sm text-slate-200">${esc(p.title)}</span><span class="block text-[11px] text-slate-600">${esc(p.subcategory)}</span></span></button>`).join("")}</div>`:""}`;
    box.classList.remove("hidden");
  }

  function openSearch() {
    const ov=$("#searchOverlay"); if(ov){ov.classList.remove("hidden");const inp=$("#mobileSearch");inp.value=state.query;setTimeout(()=>inp.focus(),10);}
  }
  function closeSearch(){ const ov=$("#searchOverlay"); if(ov) ov.classList.add("hidden"); }

  function bind() {
    $$("[data-nav]").forEach(b=>b.addEventListener("click",e=>navigate(e.currentTarget.dataset.nav)));
    $$("[data-cat]").forEach(b=>b.addEventListener("click",e=>{state.category=e.currentTarget.dataset.cat;state.query="";navigate(state.category==="all"?"/explore":`/category/${state.category}`);}));
    $$("[data-view]").forEach(b=>b.addEventListener("click",()=>{state.view=b.dataset.view;render(false);}));
    const sort=$("#sortSelect"); if(sort) sort.addEventListener("change",()=>{state.sort=sort.value;render(false);});
    $$("[data-like]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();toggleList("liked",b.dataset.like);}));
    $$("[data-save]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();toggleList("saved",b.dataset.save);}));
    $$("[data-share]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const p=bySlug(b.dataset.share);if(p)shareProduct(p);}));
    $$("[data-query]").forEach(b=>b.addEventListener("click",()=>{const q=b.dataset.query;state.query=q;if(q) navigate(`/search?q=${encodeURIComponent(q)}`);else {state.query="";navigate("/explore");}}));
    $$("[data-smart-cat]").forEach(b=>b.addEventListener("click",()=>navigate(`/category/${b.dataset.smartCat}`)));
    $$("[data-theme]").forEach(b=>b.addEventListener("click",toggleTheme));
    $$("[data-search-open]").forEach(b=>b.addEventListener("click",openSearch));
    $$("[data-search-close]").forEach(b=>b.addEventListener("click",closeSearch));
    const gs=$("#globalSearch"), ss=$("#searchSuggest");
    if(gs){
      gs.addEventListener("input",()=>{state.query=gs.value;renderSuggestions(gs,ss);});
      gs.addEventListener("keydown",e=>{if(e.key==="Enter")navigate(gs.value.trim()?`/search?q=${encodeURIComponent(gs.value.trim())}`:"/explore");if(e.key==="Escape")ss.classList.add("hidden");});
      gs.addEventListener("focus",()=>renderSuggestions(gs,ss));
    }
    const ms=$("#mobileSearch"), mb=$("#mobileSuggest");
    if(ms){
      ms.addEventListener("input",()=>{state.query=ms.value;renderSuggestions(ms,mb);});
      ms.addEventListener("keydown",e=>{if(e.key==="Enter"){closeSearch();navigate(ms.value.trim()?`/search?q=${encodeURIComponent(ms.value.trim())}`:"/explore");} if(e.key==="Escape")closeSearch();});
    }
    const clear=$("#clearSaved"); if(clear) clear.addEventListener("click",()=>{});
    $$("[data-clear-saved]").forEach(b=>b.addEventListener("click",()=>{persist(STORAGE.saved,[]);toast("Saved items cleared");render(false);}));
  }

  document.addEventListener("click", e => {
    if(e.target.id==="searchOverlay") closeSearch();
  });

  // Deterrence: do not interfere with form controls, links, or accessibility-critical actions.
  document.addEventListener("contextmenu", e=>{
    const t=e.target; if(t.matches("input,textarea,select,button,a")) return; e.preventDefault();
  });
  document.addEventListener("dragstart", e=>{
    const t=e.target; if(t.matches("img,input,textarea")) return; e.preventDefault();
  });
  document.addEventListener("keydown", e=>{
    const t=e.target;
    const editable=t.matches("input,textarea,[contenteditable='true'],select");
    const mod=e.ctrlKey||e.metaKey;
    if(editable) {
      // Keep normal editing and accessibility keyboard behavior intact.
      return;
    }
    if(e.key==="F12" || (mod && ["u","s","c","v","a"].includes(e.key.toLowerCase())) || (mod && e.shiftKey && ["i","j"].includes(e.key.toLowerCase()))) {
      e.preventDefault();
      toast("That shortcut is disabled on this site.");
    }
  });

  render();
})();
