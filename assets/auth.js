/* LifeOS cloud sync — optional. The app works fully offline without this file's
   backend ever running; it only upgrades storage from "this browser" to
   "this family, any device" when a user signs in. Talks to server/. */
(function () {
  "use strict";

  const API = window.LIFEOS_API_URL || "http://localhost:4000/api";
  const TOKEN_KEY = "lifeos.token";
  const SESSION_KEY = "lifeos.session";
  const LOCAL_ONLY_KEYS = new Set(["token", "session"]); // never sync these themselves

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (_) { return null; } }
  function isAuthed() { return !!getToken(); }

  async function api(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function localDataEntries() {
    const entries = {};
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (!full.startsWith("lifeos.")) continue;
      const key = full.slice("lifeos.".length);
      if (LOCAL_ONLY_KEYS.has(key)) continue;
      try { entries[key] = JSON.parse(localStorage.getItem(full)); } catch (_) { /* skip */ }
    }
    return entries;
  }

  // Server is the source of truth once signed in: pull first, then push whatever
  // was local-only (e.g. this device had entries the family account doesn't have yet).
  async function fullSync() {
    const remote = await api("/data");
    Object.entries(remote).forEach(([key, value]) => window.LifeOS.store.set(key, value));
    const local = localDataEntries();
    const newOnly = {};
    Object.entries(local).forEach(([key, value]) => { if (!(key in remote)) newOnly[key] = value; });
    if (Object.keys(newOnly).length) await api("/data/bulk", { method: "POST", body: { entries: newOnly } });
  }

  let pushTimer = null, pending = {};
  function pushKeyDebounced(key, value) {
    pending[key] = value;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const batch = pending; pending = {};
      for (const [k, v] of Object.entries(batch)) {
        try { await api("/data/" + encodeURIComponent(k), { method: "PUT", body: { value: v } }); } catch (_) { /* offline — will retry on next change */ }
      }
    }, 600);
  }

  async function signUp({ email, password, name, inviteCode }) {
    const session = await api("/auth/signup", { method: "POST", body: { email, password, name, inviteCode } });
    finishLogin(session);
    await fullSync();
    return session;
  }

  async function logIn({ email, password }) {
    const session = await api("/auth/login", { method: "POST", body: { email, password } });
    finishLogin(session);
    await fullSync();
    return session;
  }

  function finishLogin(session) {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: session.user, family: session.family }));
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    renderWidget();
  }

  // ---------- UI ----------
  function openAuthModal() {
    const session = getSession();
    if (session) {
      const close = window.LifeOS.modal("Cloud Sync", '' +
        '<p style="font-size:13px;color:#44474e;margin-bottom:10px">Signed in as <strong>' + session.user.email + '</strong></p>' +
        '<p style="font-size:13px;color:#44474e;margin-bottom:14px">Family invite code — share it so other members join the same synced data:<br/><span class="mono" style="font-size:16px;letter-spacing:.1em">' + session.family.inviteCode + '</span></p>' +
        '<button class="lifeos-btn-primary" id="lifeos-signout">Sign out</button>');
      document.getElementById("lifeos-signout").addEventListener("click", () => { close(); signOut(); window.LifeOS.toast("Signed out — back to local-only mode"); });
      return;
    }
    let mode = "signup";
    function render() {
      window.LifeOS.form(
        mode === "signup" ? "Create your LifeOS family account" : "Sign in to sync",
        mode === "signup"
          ? [["Name", "text"], ["Email", "email"], ["Password (min 8 chars)", "password"], ["Family invite code (optional)", "text"]]
          : [["Email", "email"], ["Password", "password"]],
        async function (v) {
          try {
            if (mode === "signup") {
              await signUp({ email: v.email, password: v.password_min_8_chars, name: v.name, inviteCode: v.family_invite_code_optional });
            } else {
              await logIn({ email: v.email, password: v.password });
            }
            window.LifeOS.toast("Synced — your family's data now follows this account");
            renderWidget();
          } catch (e) {
            window.LifeOS.toast(e.message || "Something went wrong");
          }
        },
        mode === "signup" ? "Create account" : "Sign in"
      );
      const box = document.getElementById("lifeos-modal-overlay").querySelector(".lifeos-modal-body");
      const toggle = document.createElement("p");
      toggle.style.cssText = "font-size:12px;text-align:center;margin-top:10px;color:#44474e;cursor:pointer";
      toggle.textContent = mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account";
      toggle.addEventListener("click", () => { mode = mode === "signup" ? "login" : "signup"; render(); });
      box.appendChild(toggle);
    }
    render();
  }

  function renderWidget() {
    // app.js's DOMContentLoaded listener (which mounts the topbar) is registered
    // first on every page, so #lifeos-account-sync always exists by the time this runs.
    const wrap = document.getElementById("lifeos-account-sync");
    if (!wrap) return;
    const session = getSession();
    wrap.innerHTML = session
      ? '<button data-wired="1" id="lifeos-cloud-btn" class="lifeos-sync-btn synced">&#9729; Synced as ' + session.user.email + "</button>"
      : '<button data-wired="1" id="lifeos-cloud-btn" class="lifeos-sync-btn">&#9729; Sign in to sync across devices</button>';
    document.getElementById("lifeos-cloud-btn").addEventListener("click", openAuthModal);
  }

  document.addEventListener("lifeos:store-set", function (e) {
    if (isAuthed()) pushKeyDebounced(e.detail.key, e.detail.value);
  });

  document.addEventListener("DOMContentLoaded", function () {
    renderWidget();
    if (isAuthed()) fullSync().catch(() => { /* API not reachable — stay in local-only mode */ });
  });

  window.LifeOS = window.LifeOS || {};
  window.LifeOS.cloud = { isAuthed, signUp, logIn, signOut, fullSync };
})();
