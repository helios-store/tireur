import { SEED_PRODUCTS, productSlides } from "./products-data.js";
import { firebaseConfig, WALLETS, RATES_EUR } from "./firebase-config.js";

const DEMO_MODE = firebaseConfig.apiKey === "REMPLACE_MOI";

let db = null;
let fsFns = null;
if (!DEMO_MODE) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  fsFns = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const app = initializeApp(firebaseConfig);
  db = fsFns.getFirestore(app);
}

let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("gramme_cart") || "[]");
let selectedCrypto = "USDT";
let lastOrderTotal = 0;

const eur = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

function toast(msg){
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function saveCart(){
  localStorage.setItem("gramme_cart", JSON.stringify(cart));
  renderCart();
}

async function loadProducts(){
  if (DEMO_MODE) {
    PRODUCTS = SEED_PRODUCTS.map(p => ({ ...p }));
    return;
  }
  try {
    const snap = await fsFns.getDocs(fsFns.collection(db, "products"));
    if (snap.empty) {
      PRODUCTS = SEED_PRODUCTS.map(p => ({ ...p }));
    } else {
      PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.error("Erreur chargement produits Firestore, repli sur les données locales.", e);
    PRODUCTS = SEED_PRODUCTS.map(p => ({ ...p }));
  }
}

function stockState(p){
  if (p.stock <= 0) return { cls: "out", label: "Épuisé" };
  if (p.stock <= p.maxStock * 0.2) return { cls: "low", label: "Stock bas" };
  return { cls: "ok", label: "En stock" };
}

function cardHTML(p){
  const slides = productSlides(p);
  const st = stockState(p);
  const pct = Math.max(4, Math.round((p.stock / p.maxStock) * 100));
  return `
  <article class="card" data-id="${p.id}">
    <div class="slider" data-slider>
      <span class="stock-tag ${st.cls}">${st.label}</span>
      <div class="slider-track" style="transform:translateX(0%)">
        ${slides.map(s => `<div class="slide">${s}</div>`).join("")}
      </div>
      <button class="slider-arrow prev" aria-label="Image précédente">‹</button>
      <button class="slider-arrow next" aria-label="Image suivante">›</button>
      <div class="slider-dots">
        ${slides.map((_,i) => `<span class="${i===0?'active':''}"></span>`).join("")}
      </div>
    </div>
    <div class="card-body">
      <span class="card-cat">${p.cat}</span>
      <h3 class="card-name">${p.name}</h3>
      <p class="card-tagline">${p.tagline}</p>
      <div class="stock-gauge ${st.cls==='low'?'low':''}"><i style="width:${pct}%"></i></div>
      <div class="stock-meta"><span>${p.stock} restants</span><span>${p.servings}</span></div>
      <div class="card-foot">
        <span class="price">${eur(p.price)}</span>
        <button class="add-btn" data-add="${p.id}" ${p.stock<=0?"disabled":""}>
          ${p.stock<=0?"Épuisé":"Ajouter"}
        </button>
      </div>
    </div>
  </article>`;
}

function wireSliders(container){
  $$("[data-slider]", container).forEach(slider => {
    let index = 0;
    const track = slider.querySelector(".slider-track");
    const dots = $$(".slider-dots span", slider);
    const total = dots.length;
    const go = (i) => {
      index = (i + total) % total;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d,di) => d.classList.toggle("active", di === index));
    };
    slider.querySelector(".prev").addEventListener("click", (e) => { e.stopPropagation(); go(index-1); });
    slider.querySelector(".next").addEventListener("click", (e) => { e.stopPropagation(); go(index+1); });

    let startX = 0, dragging = false;
    const start = (x) => { dragging = true; startX = x; };
    const end = (x) => {
      if (!dragging) return;
      dragging = false;
      const delta = x - startX;
      if (Math.abs(delta) > 40) go(delta < 0 ? index+1 : index-1);
    };
    slider.addEventListener("touchstart", (e) => start(e.touches[0].clientX), {passive:true});
    slider.addEventListener("touchend", (e) => end(e.changedTouches[0].clientX));
    slider.addEventListener("mousedown", (e) => start(e.clientX));
    slider.addEventListener("mouseup", (e) => end(e.clientX));
  });
}

function renderGrid(el, list){
  el.innerHTML = list.map(cardHTML).join("");
  wireSliders(el);
  $$("[data-add]", el).forEach(btn => btn.addEventListener("click", () => addToCart(btn.dataset.add)));
}

function renderFilters(){
  const cats = ["Tous", ...new Set(PRODUCTS.map(p => p.cat))];
  $("#filters").innerHTML = cats.map((c,i) => `<button class="${i===0?'active':''}" data-cat="${c}">${c}</button>`).join("");
  $$("#filters button").forEach(btn => btn.addEventListener("click", () => {
    $$("#filters button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;
    renderGrid($("#shopGrid"), cat === "Tous" ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat));
  }));
}

function addToCart(id){
  const p = PRODUCTS.find(x => x.id === id);
  if (!p || p.stock <= 0) return;
  const line = cart.find(l => l.id === id);
  const currentQty = line ? line.qty : 0;
  if (currentQty >= p.stock) { toast("Stock maximum atteint pour cet article."); return; }
  if (line) line.qty++; else cart.push({ id, qty: 1 });
  saveCart();
  toast(`${p.name} ajouté au panier`);
}
function changeQty(id, delta){
  const line = cart.find(l => l.id === id);
  if (!line) return;
  const p = PRODUCTS.find(x => x.id === id);
  line.qty += delta;
  if (line.qty > p.stock) line.qty = p.stock;
  if (line.qty <= 0) cart = cart.filter(l => l.id !== id);
  saveCart();
}
function removeFromCart(id){
  cart = cart.filter(l => l.id !== id);
  saveCart();
  toast("Article retiré du panier");
}
function cartTotal(){
  return cart.reduce((sum,l) => {
    const p = PRODUCTS.find(x => x.id === l.id);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}
function cartCount(){ return cart.reduce((s,l)=>s+l.qty,0); }

function renderCart(){
  $("#cartCount").textContent = cartCount();
  const wrap = $("#cartItems");
  if (cart.length === 0){
    wrap.innerHTML = `<div class="drawer-empty">Ton panier est vide.<br>Le catalogue t'attend →</div>`;
  } else {
    wrap.innerHTML = cart.map(l => {
      const p = PRODUCTS.find(x => x.id === l.id);
      if (!p) return "";
      return `
      <div class="cart-item" data-id="${p.id}">
        <div class="cart-item-thumb">${productSlides(p)[0]}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${eur(p.price)} / unité</div>
          <div class="qty-ctrl">
            <button data-dec>−</button>
            <span>${l.qty}</span>
            <button data-inc>+</button>
            <button class="remove-btn" data-remove>Retirer</button>
          </div>
        </div>
      </div>`;
    }).join("");
    $$("[data-dec]", wrap).forEach(b => b.addEventListener("click", e => changeQty(e.target.closest(".cart-item").dataset.id, -1)));
    $$("[data-inc]", wrap).forEach(b => b.addEventListener("click", e => changeQty(e.target.closest(".cart-item").dataset.id, 1)));
    $$("[data-remove]", wrap).forEach(b => b.addEventListener("click", e => removeFromCart(e.target.closest(".cart-item").dataset.id)));
  }
  $("#cartTotal").textContent = eur(cartTotal());
  renderHome(); // garde les jauges de stock synchrones sur l'accueil
}

function showView(name){
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#view-${name}`)?.classList.add("active");
  $$(".nav button").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "checkout") renderCheckout();
}
$$("[data-view]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));

$("#openCart").addEventListener("click", () => { $("#cartDrawer").classList.add("open"); $("#overlay").classList.add("open"); });
$("#closeCart").addEventListener("click", closeDrawer);
$("#overlay").addEventListener("click", closeDrawer);
function closeDrawer(){ $("#cartDrawer").classList.remove("open"); $("#overlay").classList.remove("open"); }

$("#goCheckout").addEventListener("click", () => {
  if (cart.length === 0) { toast("Ton panier est vide."); return; }
  closeDrawer();
  showView("checkout");
});

function renderCheckout(){
  $("#checkoutItems").innerHTML = cart.map(l => {
    const p = PRODUCTS.find(x => x.id === l.id);
    return `<div class="hero-panel-row"><span>${p.name} × ${l.qty}</span><span>${eur(p.price*l.qty)}</span></div>`;
  }).join("");
  lastOrderTotal = cartTotal();
  $("#checkoutTotal").textContent = eur(lastOrderTotal);
  renderCryptoChoices();
}

function renderCryptoChoices(){
  const el = $("#cryptoChoices");
  el.innerHTML = Object.keys(WALLETS).map(c => `<button data-crypto="${c}" class="${c===selectedCrypto?'active':''}">${c}</button>`).join("");
  $$("[data-crypto]", el).forEach(b => b.addEventListener("click", () => {
    selectedCrypto = b.dataset.crypto;
    renderCryptoChoices();
    renderWalletBox();
  }));
  renderWalletBox();
}
function renderWalletBox(){
  const w = WALLETS[selectedCrypto];
  $("#walletAddr").textContent = w.address;
  const amount = (lastOrderTotal * (RATES_EUR[selectedCrypto] || 1));
  $("#cryptoAmount").textContent = `${amount.toFixed(selectedCrypto === "BTC" ? 6 : selectedCrypto === "ETH" ? 5 : 2)} ${selectedCrypto}`;
}
$("#copyAddr").addEventListener("click", () => {
  navigator.clipboard.writeText($("#walletAddr").textContent);
  toast("Adresse copiée");
});

function randomCode(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,"0")}`;
  return `GR-${ym}-${s}`;
}
async function generateUniqueOrderNumber(){
  for (let attempt = 0; attempt < 8; attempt++){
    const code = randomCode();
    if (DEMO_MODE) {
      const orders = JSON.parse(localStorage.getItem("gramme_orders") || "{}");
      if (!orders[code]) return code;
    } else {
      const ref = fsFns.doc(db, "orders", code);
      const snap = await fsFns.getDoc(ref);
      if (!snap.exists()) return code;
    }
  }
  throw new Error("Impossible de générer un numéro de commande unique, réessaie.");
}

async function submitOrder(){
  const contact = $("#ctContact").value.trim();
  if (!contact) { toast("Indique un email ou un contact Telegram."); return; }
  if (cart.length === 0) { toast("Ton panier est vide."); return; }

  const btn = $("#confirmPayBtn");
  btn.disabled = true; btn.textContent = "Enregistrement…";

  try {
    const code = await generateUniqueOrderNumber();
    const order = {
      orderNumber: code,
      name: $("#ctName").value.trim(),
      contact,
      address: $("#ctAddress").value.trim(),
      note: $("#ctNote").value.trim(),
      items: cart.map(l => {
        const p = PRODUCTS.find(x => x.id === l.id);
        return { id: p.id, name: p.name, price: p.price, qty: l.qty };
      }),
      totalEUR: lastOrderTotal,
      crypto: selectedCrypto,
      cryptoAmount: Number((lastOrderTotal * (RATES_EUR[selectedCrypto] || 1)).toFixed(8)),
      walletUsed: WALLETS[selectedCrypto].address,
      status: "en_attente",
      createdAt: DEMO_MODE ? new Date().toISOString() : fsFns.serverTimestamp()
    };

    if (DEMO_MODE) {
      const orders = JSON.parse(localStorage.getItem("gramme_orders") || "{}");
      orders[code] = order;
      localStorage.setItem("gramme_orders", JSON.stringify(orders));
    } else {
      await fsFns.setDoc(fsFns.doc(db, "orders", code), order);
    }

    cart = [];
    saveCart();
    $("#checkoutForm").style.display = "none";
    $("#orderConfirm").style.display = "block";
    $("#orderCodeDisplay").textContent = code;
  } catch (e){
    console.error(e);
    toast("Erreur lors de l'enregistrement de la commande. Réessaie.");
  } finally {
    btn.disabled = false; btn.textContent = "J'ai envoyé le paiement";
  }
}
$("#confirmPayBtn").addEventListener("click", submitOrder);

const STATUS_LABEL = {
  en_attente: { cls: "status-pending", label: "En attente de vérification" },
  paye: { cls: "status-paid", label: "Paiement confirmé — expédition en cours" },
  annule: { cls: "status-cancelled", label: "Annulée" }
};

async function trackOrder(){
  const code = $("#trackInput").value.trim().toUpperCase();
  const box = $("#trackResult");
  if (!code) { toast("Indique un numéro de commande."); return; }

  let order = null;
  if (DEMO_MODE) {
    const orders = JSON.parse(localStorage.getItem("gramme_orders") || "{}");
    order = orders[code] || null;
  } else {
    const snap = await fsFns.getDoc(fsFns.doc(db, "orders", code));
    if (snap.exists()) order = snap.data();
  }

  if (!order) {
    box.classList.add("show");
    box.innerHTML = `Aucune commande trouvée pour <b>${code}</b>. Vérifie le numéro reçu à la confirmation.`;
    return;
  }
  const st = STATUS_LABEL[order.status] || STATUS_LABEL.en_attente;
  box.classList.add("show");
  box.innerHTML = `
    <div style="margin-bottom:10px;">Commande <b>${order.orderNumber}</b></div>
    <span class="status-pill ${st.cls}">${st.label}</span>
    <div style="margin-top:12px;color:var(--bone-dim);">
      ${order.items.map(i => `${i.name} × ${i.qty}`).join("<br>")}
    </div>
    <div style="margin-top:10px;">Total : ${eur(order.totalEUR)}</div>
  `;
}
$("#trackBtn").addEventListener("click", trackOrder);

async function sendSavTicket(){
  const contact = $("#savContact").value.trim();
  const message = $("#savMsg").value.trim();
  if (!contact || !message) { toast("Merci de renseigner un contact et un message."); return; }

  const ticket = {
    name: $("#savName").value.trim(),
    contact,
    orderNumber: $("#savOrder").value.trim().toUpperCase(),
    message,
    createdAt: DEMO_MODE ? new Date().toISOString() : fsFns.serverTimestamp(),
    resolved: false
  };

  try {
    if (DEMO_MODE) {
      const tickets = JSON.parse(localStorage.getItem("gramme_tickets") || "[]");
      tickets.push(ticket);
      localStorage.setItem("gramme_tickets", JSON.stringify(tickets));
    } else {
      await fsFns.addDoc(fsFns.collection(db, "tickets"), ticket);
    }
    toast("Message envoyé au SAV — réponse sous 24h ouvrées.");
    $("#savName").value = ""; $("#savContact").value = ""; $("#savOrder").value = ""; $("#savMsg").value = "";
  } catch (e){
    console.error(e);
    toast("Erreur lors de l'envoi, réessaie.");
  }
}
$("#savSendBtn").addEventListener("click", sendSavTicket);

function renderHome(){
  renderGrid($("#homeGrid"), PRODUCTS.slice(0,4));
}

(async function init(){
  await loadProducts();
  renderFilters();
  renderGrid($("#shopGrid"), PRODUCTS);
  renderHome();
  renderCart();
  if (DEMO_MODE) {
    console.info("GRAMME. tourne en mode démo (localStorage) — configure firebase-config.js pour brancher Firestore.");
  }
})();
