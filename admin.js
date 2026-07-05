import { firebaseConfig, ADMIN_UIDS, EMAILJS_CONFIG } from "./firebase-config.js";

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
    const input = $(".tracking-input", row);
    const sendBtn = $(".tracking-send", row);
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

/* ---------------------------------- envoi email numéro de suivi (EmailJS) ---------------------------------- */
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

function renderFilters(){
  const opts = [["all","Toutes"],["en_attente","En attente"],["paye","Payées"],["annule","Annulées"]];
  $("#statusFilters").innerHTML = opts.map(([v,l]) => `<button class="${v===currentFilter?'active':''}" data-v="${v}">${l}</button>`).join("");
  $$("#statusFilters button").forEach(b => b.addEventListener("click", () => {
    currentFilter = b.dataset.v;
    renderFilters();
    renderOrders();
  }));
}

/* ---------------------------------- démo : accès simple par mot de passe local ---------------------------------- */
function initDemoAuth(){
  $("#demoWarning").style.display = "block";
  $("#loginBtn").addEventListener("click", () => {
    // Mode démo uniquement : pas de vraie sécurité, juste pour tester l'UI admin.
    // En production (Firebase configuré), c'est Firebase Auth + firestore.rules qui protègent réellement l'accès.
    const pass = $("#pass").value;
    if (pass.length < 4) { $("#loginError").textContent = "Mot de passe démo : n'importe quoi de 4+ caractères."; return; }
    showDash();
  });
}
function showDash(){
  $("#loginView").style.display = "none";
  $("#dashView").style.display = "block";
  $("#logoutBtn").style.display = "inline-flex";
  renderFilters();
  renderOrders();
}

/* ---------------------------------- firebase : vraie auth admin ---------------------------------- */
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
  $("#email").closest(".field").style.display = "none"; // pas d'email requis en démo
  initDemoAuth();
} else {
  initFirebaseAuth();
}
