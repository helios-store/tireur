
import { firebaseConfig, ADMIN_UIDS, EMAILJS_CONFIG } from "./firebase-config.js";
import { SEED_PRODUCTS } from "./products-data.js";

const DEMO_MODE = firebaseConfig.apiKey === "REMPLACE_MOI";
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const eur = (n) => Number(n||0).toLocaleString("fr-FR", {minimumFractionDigits:2, maximumFractionDigits:2}) + " €";

function toast(msg){
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

let currentFilter = "all";
const STATUS_LABEL = {
  en_attente: { label: "En attente", cls: "status-pending" },
  paye: { label: "Payé", cls: "status-paid" },
  annule: { label: "Annulé", cls: "status-cancelled" }
};

function orderRowHTML(o){
  const st = STATUS_LABEL[o.status] || STATUS_LABEL.en_attente;
  const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("fr-FR") : (o.createdAt ? new Date(o.createdAt).toLocaleString("fr-FR") : "—");
  return `
  <div class="order-row" data-code="${o.orderNumber}">
    <div class="order-row-head">
      <div>
        <div class="order-code">${o.orderNumber}</div>
        <div class="order-meta">${date} — ${o.name || "sans nom"} — ${o.contact}</div>
      </div>
      <span class="status-pill ${st.cls}">${st.label}</span>
    </div>
    <div class="order-items">
      ${o.items.map(i => `${i.name} × ${i.qty} — ${eur(i.price*i.qty)}`).join("<br>")}
    </div>
    <div class="order-meta" style="margin-bottom:10px;">
      Total : <b style="color:var(--bone);">${eur(o.totalEUR)}</b>
      ${o.weightGrams ? ` · Poids colis : <b>${(o.weightGrams/1000).toFixed(2)} kg</b> · Port : <b>${eur(o.shippingEUR)}</b>` : ""} ·
      À recevoir : <b style="color:var(--lime);">${o.cryptoAmount} ${o.crypto}</b> ·
      Wallet : ${o.walletUsed}<br>
      ${o.address ? "Livraison : " + o.address + "<br>" : ""}
      ${o.note ? "Note : " + o.note : ""}
    </div>
    <div class="order-actions">
      <button class="ok" data-action="paye">Marquer payé</button>
      <button class="cancel" data-action="annule">Annuler</button>
      <button class="reset" data-action="en_attente">Remettre en attente</button>
    </div>
    <div class="tracking-row">
      <input type="text" class="tracking-input" placeholder="Numéro de suivi Mondial Relay" value="${o.trackingNumber || ""}">
      <button class="tracking-send">
        ${o.trackingNumber ? "Renvoyer le numéro de suivi" : "Envoyer le numéro de suivi"}
      </button>
      ${o.trackingSentAt ? `<span class="tracking-sent-meta">Envoyé le ${new Date(o.trackingSentAt).toLocaleString("fr-FR")}</span>` : ""}
    </div>
  </div>`;
}

async function renderOrders(){
  let orders = [];
  if (DEMO_MODE) {
    const stored = JSON.parse(localStorage.getItem("gramme_orders") || "{}");
    orders = Object.values(stored);
  } else {
    orders = window.__ordersCache || [];
  }
  orders.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0) || (b.createdAt||"").localeCompare(a.createdAt||""));
  if (currentFilter !== "all") orders = orders.filter(o => o.status === currentFilter);

  const list = $("#ordersList");
  list.innerHTML = orders.length
    ? orders.map(orderRowHTML).join("")
    : `<p style="color:var(--bone-dim);font-family:var(--mono);">Aucune commande pour ce filtre.</p>`;

  $$(".order-actions button", list).forEach(btn => {
    btn.addEventListener("click", async () => {
      const code = btn.closest(".order-row").dataset.code;
      await updateStatus(code, btn.dataset.action);
    });
  });

  $$(".order-row", list).forEach(row => {
    const code = row.dataset.code;
    const order = orders.find(o => o.orderNumber === code);
    const input = row.querySelector(".tracking-input");
    const sendBtn = row.querySelector(".tracking-send");
    sendBtn?.addEventListener("click", () => sendTracking(order, input.value.trim(), sendBtn));
  });
}

async function updateStatus(code, status){
  if (DEMO_MODE) {
    const stored = JSON.parse(localStorage.getItem("gramme_orders") || "{}");
    if (stored[code]) { stored[code].status = status; localStorage.setItem("gramme_orders", JSON.stringify(stored)); }
    toast(`Commande ${code} → ${status}`);
    renderOrders();
  } else {
    const fsFns = window.__fsFns;
    await fsFns.updateDoc(fsFns.doc(window.__db, "orders", code), { status });
    toast(`Commande ${code} → ${status}`);
  }
}

let emailjsLib = null;
async function getEmailJS(){
  if (emailjsLib) return emailjsLib;
  const mod = await import("https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm");
  emailjsLib = mod.default;
  emailjsLib.init({ publicKey: EMAILJS_CONFIG.publicKey });
  return emailjsLib;
}

async function persistTracking(code, trackingNumber, sentAt){
  if (DEMO_MODE) {
    const stored = JSON.parse(localStorage.getItem("gramme_orders") || "{}");
    if (stored[code]) {
      stored[code].trackingNumber = trackingNumber;
      stored[code].trackingSentAt = sentAt;
      localStorage.setItem("gramme_orders", JSON.stringify(stored));
    }
  } else {
    const fsFns = window.__fsFns;
    await fsFns.updateDoc(fsFns.doc(window.__db, "orders", code), { trackingNumber, trackingSentAt: sentAt });
  }
}

async function sendTracking(order, trackingNumber, btn){
  if (!trackingNumber) { toast("Renseigne un numéro de suivi avant d'envoyer."); return; }
  if (!order.contact || !order.contact.includes("@")) {
    toast("Le contact de cette commande n'est pas un email (Telegram ?) — envoi impossible via ce bouton.");
    return;
  }
  const originalLabel = btn.textContent;
  btn.disabled = true; btn.textContent = "Envoi…";
  try {
    const emailjs = await getEmailJS();
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.trackingTemplateId, {
      to_email: order.contact,
      customer_name: order.name || "client",
      order_number: order.orderNumber,
      tracking_number: trackingNumber
    });
    const sentAt = new Date().toISOString();
    await persistTracking(order.orderNumber, trackingNumber, sentAt);
    toast(`Numéro de suivi envoyé à ${order.contact}`);
    renderOrders();
  } catch (e){
    console.error(e);
    toast("Échec de l'envoi de l'email. Vérifie la config EmailJS.");
  } finally {
    btn.disabled = false; btn.textContent = originalLabel;
  }
}

function getStoredProducts(){
  const stored = JSON.parse(localStorage.getItem("gramme_products") || "null");
  if (stored) return stored;
  const seeded = {};
  SEED_PRODUCTS.forEach(p => seeded[p.id] = { ...p });
  localStorage.setItem("gramme_products", JSON.stringify(seeded));
  return seeded;
}

function stockRowHTML(p){
  const low = p.stock <= 0;
  return `
  <div class="stock-row" data-id="${p.id}">
    <div class="stock-row-info">
      <div class="stock-row-name">${p.name}</div>
      <div class="stock-row-meta">${p.cat} · ${p.dosage} · Réf. ${p.lot}</div>
    </div>
    <div class="stock-row-actions">
      <input type="number" class="stock-input ${low ? 'low' : ''}" min="0" max="${p.maxStock}" value="${p.stock}">
      <span class="stock-row-meta">/ ${p.maxStock}</span>
      <button class="stock-save">Enregistrer</button>
    </div>
  </div>`;
}

async function renderStock(){
  let products = [];
  if (DEMO_MODE) {
    products = Object.values(getStoredProducts());
  } else {
    products = window.__productsCache || [];
  }
  products.sort((a,b) => a.name.localeCompare(b.name));

  const list = $("#stockList");
  list.innerHTML = products.length
    ? products.map(stockRowHTML).join("")
    : `<p style="color:var(--bone-dim);font-family:var(--mono);">Aucun produit trouvé.</p>`;

  $$(".stock-row", list).forEach(row => {
    const id = row.dataset.id;
    const input = row.querySelector(".stock-input");
    const saveBtn = row.querySelector(".stock-save");
    input.addEventListener("input", () => input.classList.toggle("low", Number(input.value) <= 0));
    saveBtn.addEventListener("click", () => saveStock(id, input, saveBtn));
  });
}

async function saveStock(id, input, btn){
  let value = Math.round(Number(input.value));
  if (Number.isNaN(value) || value < 0) value = 0;
  input.value = value;
  const originalLabel = btn.textContent;
  btn.disabled = true; btn.textContent = "Enregistrement…";
  try {
    if (DEMO_MODE) {
      const stored = getStoredProducts();
      if (stored[id]) {
        stored[id].stock = value;
        localStorage.setItem("gramme_products", JSON.stringify(stored));
      }
    } else {
      const fsFns = window.__fsFns;
      await fsFns.updateDoc(fsFns.doc(window.__db, "products", id), { stock: value });
    }
    toast(`Stock mis à jour : ${id} → ${value}`);
  } catch (e){
    console.error(e);
    toast("Échec de la mise à jour du stock.");
  } finally {
    btn.disabled = false; btn.textContent = originalLabel;
  }
}

function initTabs(){
  $$("#tabNav button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("#tabNav button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      $("#ordersTab").style.display = tab === "orders" ? "block" : "none";
      $("#stockTab").style.display = tab === "stock" ? "block" : "none";
      if (tab === "stock") renderStock();
    });
  });
}

function renderFilters(){
  const opts = [["all","Toutes"],["en_attente","En attente"],["paye","Payées"],["annule","Annulées"]];
  $("#statusFilters").innerHTML = opts.map(([v,l]) => `<button class="${v===currentFilter?'active':''}" data-v="${v}">${l}</button>`).join("");
  $$("#statusFilters button").forEach(b => b.addEventListener("click", () => {
    currentFilter = b.dataset.v;
    renderFilters();
    renderOrders();
  }));
}

function initDemoAuth(){
  $("#demoWarning").style.display = "block";
  $("#loginBtn").addEventListener("click", () => {

    const pass = $("#pass").value;
    if (pass.length < 4) { $("#loginError").textContent = "Mot de passe démo : n'importe quoi de 4+ caractères."; return; }
    showDash();
  });
  $("#logoutBtn").addEventListener("click", demoLogout);
}
function showDash(){
  $("#loginView").style.display = "none";
  $("#dashView").style.display = "block";
  $("#logoutBtn").style.display = "inline-flex";
  initTabs();
  renderFilters();
  renderOrders();
}

function demoLogout(){
  $("#dashView").style.display = "none";
  $("#logoutBtn").style.display = "none";
  $("#loginView").style.display = "block";
  const passField = $("#pass");
  if (passField) passField.value = "";
  const err = $("#loginError");
  if (err) err.textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function initFirebaseAuth(){
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const authMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  const fsFns = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fsFns.getFirestore(app);
  window.__fsFns = fsFns; window.__db = db;

  authMod.onAuthStateChanged(auth, async (user) => {
    if (user && ADMIN_UIDS.includes(user.uid)) {
      fsFns.onSnapshot(fsFns.collection(db, "orders"), (snap) => {
        window.__ordersCache = snap.docs.map(d => d.data());
        renderOrders();
      });
      fsFns.onSnapshot(fsFns.collection(db, "products"), (snap) => {
        window.__productsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if ($("#stockTab").style.display !== "none") renderStock();
      });
      showDash();
    } else if (user) {
      $("#loginError").textContent = "Ce compte n'a pas les droits admin (UID absent de ADMIN_UIDS).";
      await authMod.signOut(auth);
    }
  });

  $("#loginBtn").addEventListener("click", async () => {
    $("#loginError").textContent = "";
    try {
      await authMod.signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#pass").value);
    } catch (e){
      $("#loginError").textContent = "Identifiants incorrects.";
    }
  });
  $("#logoutBtn").addEventListener("click", () => authMod.signOut(auth).then(() => location.reload()));
}

if (DEMO_MODE) {
  $("#email").closest(".field").style.display = "none";
  initDemoAuth();
} else {
  initFirebaseAuth();
}
