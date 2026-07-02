/* LifeOS shared runtime — store, toast, modal, quick entry, command palette, affiliates, mobile nav */
(function () {
  "use strict";

  // ---------- store ----------
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem("lifeos." + k)); return v === null || v === undefined ? d : v; } catch (_) { return d; } },
    set(k, v) {
      localStorage.setItem("lifeos." + k, JSON.stringify(v));
      document.dispatchEvent(new CustomEvent("lifeos:store-set", { detail: { key: k, value: v } }));
    },
  };

  // ---------- INR formatter ----------
  function inr(n) {
    n = Math.round(Number(n) || 0);
    if (n >= 1e7) return "₹" + (n / 1e7).toFixed(n % 1e7 ? 1 : 0) + " Cr";
    if (n >= 1e5) return "₹" + (n / 1e5).toFixed(n % 1e5 ? 1 : 0) + " L";
    return "₹" + n.toLocaleString("en-IN");
  }

  // ---------- toast ----------
  function toast(msg) {
    let wrap = document.getElementById("lifeos-toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "lifeos-toast-wrap"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "lifeos-toast";
    t.innerHTML = '<span class="dot"></span><span></span>';
    t.lastChild.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  // ---------- modal ----------
  function modal(title, bodyHTML, onMount) {
    closeModal();
    const ov = document.createElement("div");
    ov.id = "lifeos-modal-overlay";
    ov.innerHTML = '<div class="lifeos-modal"><div class="lifeos-modal-head"><h3></h3>' +
      '<button class="lifeos-modal-close" aria-label="Close">&#10005;</button></div>' +
      '<div class="lifeos-modal-body"></div></div>';
    ov.querySelector("h3").textContent = title;
    ov.querySelector(".lifeos-modal-body").innerHTML = bodyHTML;
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
    ov.querySelector(".lifeos-modal-close").addEventListener("click", closeModal);
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add("show"));
    if (onMount) onMount(ov);
    return closeModal;
  }
  function closeModal() {
    const el = document.getElementById("lifeos-modal-overlay");
    if (el) { el.classList.remove("show"); setTimeout(() => el.remove(), 200); }
  }

  function form(title, fields, cb, submitLabel) {
    let html = "";
    fields.forEach(function (f, i) {
      html += '<div class="lifeos-field"><label>' + f[0] + "</label>";
      if (f[1] === "select") {
        html += '<select data-i="' + i + '">' + f[2].map(o => "<option>" + o + "</option>").join("") + "</select>";
      } else if (f[1] === "textarea") {
        html += '<textarea data-i="' + i + '" rows="3"></textarea>';
      } else {
        const val = f[3] !== undefined && f[3] !== null ? String(f[3]).replace(/"/g, "&quot;") : "";
        html += '<input data-i="' + i + '" type="' + f[1] + '"' + (f[2] ? ' placeholder="' + f[2] + '"' : "") + (val ? ' value="' + val + '"' : "") + "/>";
      }
      html += "</div>";
    });
    html += '<button class="lifeos-btn-primary">' + (submitLabel || "Save") + "</button>";
    return modal(title, html, function (ov) {
      ov.querySelector(".lifeos-btn-primary").addEventListener("click", function () {
        const vals = {};
        fields.forEach(function (f, i) {
          vals[f[0].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "")] = ov.querySelector('[data-i="' + i + '"]').value;
        });
        closeModal();
        cb(vals);
      });
      const first = ov.querySelector("input,select,textarea");
      if (first) first.focus();
    });
  }

  // ---------- quick entry ----------
  function quickEntry(presetType) {
    form("Quick Entry", [
      ["Type", "select", ["Meal", "Workout", "Habit", "Expense", "Note"]],
      ["Description", "text", "e.g. Masala oats - 320 kcal"],
      ["Value (kcal / kg / INR)", "text", "optional"],
    ], function (v) {
      if (!v.description) { toast("Add a short description"); return; }
      const logs = store.get("logs", []);
      logs.push({ type: v.type, text: v.description, value: v.value_kcal_kg_inr, ts: Date.now() });
      store.set("logs", logs);
      toast(v.type + " logged");
      document.dispatchEvent(new CustomEvent("lifeos:log"));
    }, "Log Entry");
    if (presetType) {
      const sel = document.querySelector("#lifeos-modal-overlay select");
      if (sel) sel.value = presetType;
    }
  }

  // ---------- notifications ----------
  const NOTIFS = [
    ["B12 supplement low", "Restock recommended - 2 days left"],
    ["HDFC Life premium due", "Rs 28,500 due 15 Jul - 13 days left"],
    ["Portfolio rebalance due", "Equity allocation drifted +3.1%"],
  ];
  function notifications() {
    const existing = document.getElementById("lifeos-notif");
    if (existing) { existing.remove(); return; }
    const p = document.createElement("div");
    p.id = "lifeos-notif";
    p.innerHTML = NOTIFS.map(n =>
      '<div class="n-item"><div><div class="t">' + n[0] + '</div><div class="s">' + n[1] + "</div></div></div>").join("");
    document.body.appendChild(p);
    setTimeout(() => document.addEventListener("click", function h(e) {
      if (!p.contains(e.target)) { p.remove(); document.removeEventListener("click", h); }
    }), 0);
  }

  // ---------- command palette (Ctrl/Cmd+K) ----------
  const COMMANDS = [
    ["dashboard", "Dashboard", "dashboard.html", "Systems overview"],
    ["monitor_heart", "Health", "health.html", "Biometrics & recovery"],
    ["payments", "Finance", "finance.html", "Net worth & allocation"],
    ["account_balance_wallet", "Budget Planner", "budget.html", "Give every rupee a job"],
    ["flight_takeoff", "Vacation Planner", "vacation.html", "Itinerary, packing list & trip budget"],
    ["receipt_long", "Taxes", "taxes.html", "Old vs new regime, worked out"],
    ["restaurant", "Nutrition", "nutrition.html", "Meals & macros"],
    ["calendar_today", "Calendar", "calendar.html", "Personal life calendar"],
    ["verified_user", "Insurance", "insurance.html", "Policies & premium reminders"],
    ["psychology", "Mind", "mental.html", "Focus & mental performance"],
    ["family_restroom", "Nominees", "nominees.html", "Family-visible nominee registry"],
    ["account_tree", "Family Tree", "family-map.html", "Click anyone for a quick well-being insight"],
    ["explore", "Around Me", "around-me.html", "Movies & events nearby"],
    ["add_circle", "Log a quick entry", "@entry", "Meal, workout, expense, note"],
    ["self_improvement", "Start breathing session", "mental.html#breathe", "60s box breathing"],
    ["pie_chart", "Design Your Plate", "plate.html", "Breakfast to dinner, portioned for you"],
    ["request_quote", "Liabilities", "liabilities.html", "Loans, EMIs & faster payoff"],
    ["folder_shared", "Document Vault", "vault.html", "Every paper's location + DigiLocker"],
    ["fact_check", "Life Audit report", "audit.html", "All your gaps in one report"],
    ["home", "Home", "index.html", "Landing page"],
  ];
  function palette() {
    if (document.getElementById("lifeos-palette")) { closePalette(); return; }
    const ov = document.createElement("div");
    ov.id = "lifeos-palette";
    ov.innerHTML = '<div class="lp-box"><input placeholder="Search modules & actions"/><div class="lp-list"></div>' +
      '<div class="lp-hint">Up/Down navigate - Enter open - Esc close</div></div>';
    document.body.appendChild(ov);
    const input = ov.querySelector("input"), list = ov.querySelector(".lp-list");
    let sel = 0, items = [];
    function render() {
      const q = input.value.trim().toLowerCase();
      items = COMMANDS.filter(c => !q || (c[1] + " " + c[3]).toLowerCase().includes(q));
      sel = Math.min(sel, Math.max(0, items.length - 1));
      list.innerHTML = items.map((c, i) =>
        '<div class="lp-item' + (i === sel ? " sel" : "") + '" data-i="' + i + '">' +
        '<span class="material-symbols-outlined">' + c[0] + "</span><div><div class='lp-t'>" + c[1] +
        "</div><div class='lp-s'>" + c[3] + "</div></div></div>").join("") ||
        '<div class="lp-empty">No matches</div>';
      list.querySelectorAll(".lp-item").forEach(el => {
        el.addEventListener("click", () => go(items[+el.dataset.i]));
        el.addEventListener("mousemove", () => { sel = +el.dataset.i; render(); });
      });
    }
    function go(c) {
      if (!c) return;
      closePalette();
      if (c[2] === "@entry") { quickEntry(); return; }
      location.href = c[2];
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, items.length - 1); render(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
      else if (e.key === "Enter") go(items[sel]);
      else if (e.key === "Escape") closePalette();
      else setTimeout(render);
    });
    ov.addEventListener("click", (e) => { if (e.target === ov) closePalette(); });
    render();
    requestAnimationFrame(() => { ov.classList.add("show"); input.focus(); });
  }
  function closePalette() {
    const el = document.getElementById("lifeos-palette");
    if (el) { el.classList.remove("show"); setTimeout(() => el.remove(), 150); }
  }

  // ---------- affiliate engine ----------
  // Affiliation = contextual suggestions that make the user better via a partner's
  // service. LifeOS earns a referral commission; partners never see user data.
  const PARTNER_LINKS = {
    "Manipal Hospitals": "https://www.manipalhospitals.com",
    "Practo": "https://www.practo.com",
    "Superhealth Hospitals": "https://www.superhealth.co.in",
    "Dezerv": "https://www.dezerv.in",
    "INDmoney": "https://www.indmoney.com",
    "Ditto Insurance": "https://joinditto.in",
    "The Whole Truth": "https://www.thewholetruthfoods.com",
    "Eat Fit": "https://www.eatfit.in",
    "FreshToHome": "https://www.freshtohome.com",
    "HealthifyMe": "https://www.healthifyme.com",
    "Cult.fit": "https://www.cult.fit",
    "Anytime Fitness": "https://www.anytimefitness.co.in",
    "Oura Ring": "https://ouraring.com",
    "Eight Sleep": "https://www.eightsleep.com",
    "Amaha": "https://www.amahahealth.com",
    "FNP": "https://www.fnp.com",
    "IGP": "https://www.igp.com",
    "Paisabazaar": "https://www.paisabazaar.com",
    "BankBazaar": "https://www.bankbazaar.com",
    "BigBasket": "https://www.bigbasket.com",
    "Swiggy Instamart": "https://www.swiggy.com/instamart",
    "Blinkit": "https://blinkit.com",
    "Zepto": "https://www.zeptonow.com",
    "Cleartax": "https://cleartax.in",
  };
  function openPartner(name) {
    const url = PARTNER_LINKS[name];
    if (url) {
      toast("Opening " + name + " — your LifeOS partner code is applied");
      setTimeout(() => window.open(url, "_blank", "noopener"), 350);
    } else {
      toast(name + " — partnership launching soon");
    }
  }
  const AFFILIATES = {
    "health.html": [
      ["labs", "Manipal Hospitals", "Your Vitamin B12 is at 42% — book a full-body diagnostic panel this week.", "LifeOS members get 20% off health checkups"],
      ["local_hospital", "Superhealth Hospitals", "Annual executive screening is due for your age band (Bangalore).", "Priority slots reserved for LifeOS users"],
      ["stethoscope", "Practo", "HRV dipped 3 nights in a row — a quick tele-consult can rule out causes.", "First consult free with partner code"],
    ],
    "finance.html": [
      ["account_balance", "Dezerv", "Equity allocation drifted +3.1% past your target — get an expert-managed rebalance.", "Free portfolio review for LifeOS users"],
      ["trending_up", "INDmoney", "You hold US tech exposure — track US stocks, MFs & net worth in one place.", "Zero-commission US investing offer"],
    ],
    "taxes.html": [
      ["receipt_long", "Cleartax", "Old vs new regime worked out — file your ITR before 31 July with CA-assisted review if you need it.", "20% off CA-assisted filing for LifeOS users"],
    ],
    "nutrition.html": [
      ["nutrition", "The Whole Truth", "You're 60g short of your 140g protein target most days — clean protein, no fine print.", "15% off first order for LifeOS members"],
      ["restaurant_menu", "Eat Fit", "Your Keto-prep Mondays match Eat Fit's chef-made keto menu in Bangalore.", "Free delivery on subscription plans"],
      ["set_meal", "FreshToHome", "Sunday meal prep detected — fresh, antibiotic-free proteins delivered same day.", "Rs 200 off your first basket"],
    ],
    "plate.html": [
      ["nutrition", "The Whole Truth", "Your protein target is easier with clean bars & powders between meals.", "15% off first order for LifeOS members"],
      ["monitoring", "HealthifyMe", "Track whether your real plates match these designs — snap a photo, get macros.", "1 month premium free via LifeOS"],
      ["restaurant_menu", "Eat Fit", "Too busy to build the lunch plate? Eat Fit's bowls follow the same split.", "Free delivery on subscription plans"],
    ],
    "liabilities.html": [
      ["swap_horiz", "Paisabazaar", "If any loan is above 9.5%, a balance transfer could cut your rate — compare across 30+ banks.", "Free rate comparison for LifeOS users"],
      ["account_balance", "Dezerv", "Finishing a loan early? Redirect the freed-up EMI into a managed portfolio the same month.", "Free planning session"],
    ],
    "insurance.html": [
      ["support_agent", "Ditto Insurance", "You have a critical-illness gap and an inflation-mismatched 2018 term cover — talk to a no-spam advisor.", "Free 30-min consultation, zero sales pressure"],
    ],
    "mental.html": [
      ["self_improvement", "Cult.fit", "Your meditation streak is 4/5 — lock it in with guided mind packs.", "1 month of Cult Mind free for LifeOS users"],
      ["psychology", "Amaha", "Sustained high focus load this month — a professional check-in keeps performance durable.", "20% off first therapy session"],
    ],
  };
  function initialsFor(name) {
    const clean = name.replace(/[^A-Za-z0-9 ]/g, " ").trim();
    let words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 1) words = clean.split(/(?=[A-Z])/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return (clean.slice(0, 2) || "??").toUpperCase();
  }
  function colorFor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return "hsl(" + (hash % 360) + ", 45%, 32%)";
  }
  function domainFor(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return url; }
  }
  // Prominent right-side rail: fixed, independently scrollable, logo + real link per
  // partner. Lives outside <main> entirely so it never fights each page's own layout —
  // #lifeos-aff-rail's presence is what reserves space for it (see app.css :has() rule).
  function renderAffiliates() {
    const page = location.pathname.split("/").pop() || "index.html";
    const list = AFFILIATES[page];
    if (!list) return;
    const cards = list.map(function (a) {
      const name = a[1], url = PARTNER_LINKS[name];
      const tag = url ? "a" : "div";
      const attrs = url ? ' href="' + url + '" target="_blank" rel="noopener"' : "";
      return "<" + tag + ' class="lifeos-affr-card' + (url ? "" : " disabled") + '"' + attrs + '>' +
        '<span class="lifeos-affr-logo" style="background:' + colorFor(name) + '">' + initialsFor(name) + "</span>" +
        '<span class="lifeos-affr-body">' +
        '<span class="lifeos-affr-name">' + name + "</span>" +
        '<span class="lifeos-affr-why">' + a[2] + "</span>" +
        '<span class="lifeos-affr-link">' + (url ? domainFor(url) + " &#8599;" : "Launching soon") + "</span>" +
        "</span></" + tag + ">";
    }).join("");
    const rail = document.createElement("aside");
    rail.id = "lifeos-aff-rail";
    rail.innerHTML =
      '<div class="lifeos-affr-title">Suggested for you</div>' +
      '<div class="lifeos-affr-sub">Curated from your current metrics — LifeOS may earn a referral fee</div>' +
      cards;
    document.body.appendChild(rail);
  }

  // ---------- mobile nav ----------
  function initMobileNav() {
    const nav = document.getElementById("lifeos-nav");
    if (!nav) return;
    const btn = document.createElement("button");
    btn.id = "lifeos-menu-btn";
    btn.setAttribute("aria-label", "Menu");
    btn.innerHTML = '<span class="material-symbols-outlined">menu</span>';
    btn.dataset.wired = 1;
    const bd = document.createElement("div");
    bd.id = "lifeos-nav-backdrop";
    document.body.append(btn, bd);
    const toggle = (open) => {
      nav.classList.toggle("open", open);
      bd.classList.toggle("show", open);
      btn.firstChild.textContent = open ? "close" : "menu";
    };
    btn.addEventListener("click", () => toggle(!nav.classList.contains("open")));
    bd.addEventListener("click", () => toggle(false));
  }

  // ---------- search & shortcuts ----------
  function initSearch() {
    document.querySelectorAll('input[placeholder*="earch"]').forEach(function (inp) {
      inp.addEventListener("focus", function () { inp.blur(); palette(); });
    });
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette(); }
      if (e.key === "Escape") { closePalette(); closeModal(); }
    });
  }

  // ---------- generic click wiring ----------
  const ICON_ACTIONS = {
    more_horiz: "More options coming in settings", more_vert: "More options coming in settings",
    filter_list: "Filters apply automatically in this build", tune: "Filters apply automatically in this build",
    download: "Preparing download", ios_share: "Secure share link copied to clipboard",
  };
  function label(el) {
    let t = (el.textContent || "").replace(/\s+/g, " ").trim();
    el.querySelectorAll(".material-symbols-outlined").forEach(s => { t = t.replace(s.textContent.trim(), "").trim(); });
    return t;
  }
  function genericClicks() {
    document.addEventListener("click", function (e) {
      const span = e.target.closest("span.material-symbols-outlined");
      if (span && span.textContent.trim() === "notifications" && !e.target.closest("[data-wired]")) {
        e.preventDefault(); notifications(); return;
      }
      const el = e.target.closest("button, a");
      if (!el || el.dataset.wired || el.hasAttribute("onclick") || el.type === "submit") return;
      if (el.closest("#lifeos-modal-overlay") || el.closest("#lifeos-notif") || el.closest("#lifeos-palette")) return;
      if (el.tagName === "A") {
        const h = el.getAttribute("href");
        if (h && h !== "#") return;
        e.preventDefault();
      }
      const t = label(el);
      if (/quick entry|new log|add custom entry/i.test(t)) { quickEntry(); return; }
      // partner CTAs anywhere in the page -> affiliate flow
      if (/(view offer|book session|connect to advisor|order now|view menu|get 10% off|learn more|view affiliate partners|explore all partners|view dashboard|optimize now)/i.test(t)) {
        let node = el, partner = null;
        for (let i = 0; i < 7 && node; i++, node = node.parentElement) {
          const txt = node.textContent || "";
          partner = Object.keys(PARTNER_LINKS).find(p => txt.includes(p));
          if (partner) break;
        }
        if (partner) { openPartner(partner); return; }
        toast("Partner catalogue — more partners onboarding");
        return;
      }
      if (t === "") {
        const ic = el.querySelector(".material-symbols-outlined");
        const name = ic ? ic.textContent.trim() : "";
        if (name === "add") { quickEntry(); return; }
        if (name === "notifications") { notifications(); return; }
        toast(ICON_ACTIONS[name] || "Action noted");
        return;
      }
      if (/^settings$/i.test(t)) { toast("Settings arrive with user accounts"); return; }
      if (/^support$/i.test(t)) { toast("Support: care@lifeos.in"); return; }
      toast((t.length > 40 ? t.slice(0, 40) : t) + " - request received");
    });
  }

  // ---------- deep links (#breathe) ----------
  function initDeepLinks() {
    if (location.hash === "#breathe") {
      const b = [...document.querySelectorAll("button")].find(x => /initiate session/i.test(x.textContent));
      if (b) setTimeout(() => b.click(), 400);
    }
  }

  // ---------- family account switcher ----------
  function initFamily() {
    const nav = document.getElementById("lifeos-nav");
    if (!nav) return;
    const bottom = nav.querySelector(":scope > div:last-child");
    const members = [["VJ", "Vijay"], ["AS", "Ananya"], ["RK", "Papa"]];
    const cur = store.get("member", "Vijay");
    const wrap = document.createElement("div");
    wrap.id = "lifeos-family-widget";
    wrap.style.cssText = "padding:14px 12px 10px;border-top:1px solid #e2e2e3;margin-top:8px";
    wrap.innerHTML = '<div style="font-size:9px;font-weight:700;letter-spacing:.18em;color:#44474e;margin-bottom:8px">FAMILY ACCOUNT</div>' +
      '<div style="display:flex;gap:8px">' + members.map(m =>
        '<button data-wired="1" data-m="' + m[1] + '" title="' + m[1] + '" style="width:34px;height:34px;border-radius:99px;border:2px solid ' +
        (m[1] === cur ? "#3dcc60" : "#e2e2e3") + ";background:" + (m[1] === cur ? "#002D40" : "#f3f3f4") +
        ";color:" + (m[1] === cur ? "#fff" : "#44474e") + ';font-size:11px;font-weight:700;cursor:pointer">' + m[0] + "</button>").join("") +
      '<button data-wired="1" data-m="+" title="Add member" style="width:34px;height:34px;border-radius:99px;border:1px dashed #d1d1d1;background:none;color:#44474e;cursor:pointer">+</button></div>';
    nav.insertBefore(wrap, bottom);
    wrap.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.m === "+") { toast("Member invites arrive with user accounts"); return; }
      store.set("member", b.dataset.m);
      toast("Viewing " + b.dataset.m + "'s LifeOS");
      wrap.querySelectorAll("button").forEach(x => {
        if (x.dataset.m === "+") return;
        const act = x.dataset.m === b.dataset.m;
        x.style.borderColor = act ? "#3dcc60" : "#e2e2e3";
        x.style.background = act ? "#002D40" : "#f3f3f4";
        x.style.color = act ? "#fff" : "#44474e";
      });
    }));
  }

  // ---------- collapsible sidebar ----------
  function initSidebarCollapse() {
    const nav = document.getElementById("lifeos-nav");
    if (!nav) return;
    const btn = document.createElement("button");
    btn.id = "lifeos-nav-toggle";
    btn.type = "button";
    btn.dataset.wired = "1";
    btn.setAttribute("aria-label", "Collapse sidebar");
    btn.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    nav.appendChild(btn);
    function apply(collapsed) {
      document.body.classList.toggle("lifeos-nav-collapsed", collapsed);
      btn.querySelector(".material-symbols-outlined").textContent = collapsed ? "chevron_right" : "chevron_left";
      btn.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    }
    btn.addEventListener("click", function () {
      const collapsed = !document.body.classList.contains("lifeos-nav-collapsed");
      store.set("navCollapsed", collapsed);
      apply(collapsed);
    });
    apply(!!store.get("navCollapsed", false));
  }

  window.LifeOS = { store, toast, modal, form, quickEntry, notifications, palette, inr, openPartner };
  document.addEventListener("DOMContentLoaded", function () {
    initSearch(); genericClicks(); initMobileNav(); initDeepLinks(); renderAffiliates(); initFamily(); initSidebarCollapse();
  });
})();
