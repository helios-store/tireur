/* ==========================================================================
   Configuration Firebase — REMPLACE ces valeurs par celles de TON projet
   (Console Firebase > Paramètres du projet > Tes applications > SDK config).
   Ces clés "web" ne sont pas secrètes en soi : c'est firestore.rules qui
   protège réellement tes données, pas cette config. Voir README.md.
   ========================================================================== */

export const firebaseConfig = {
  apiKey: "REMPLACE_MOI",
  authDomain: "REMPLACE_MOI.firebaseapp.com",
  projectId: "REMPLACE_MOI",
  storageBucket: "REMPLACE_MOI.appspot.com",
  messagingSenderId: "REMPLACE_MOI",
  appId: "REMPLACE_MOI"
};

// UID Firebase Auth du/des compte(s) admin autorisés (voir firestore.rules)
export const ADMIN_UIDS = ["REMPLACE_MOI_PAR_TON_UID_ADMIN"];

export const WALLETS = {
  BTC:  { label: "Bitcoin (BTC)",        address: "bc1qmdypexays9rfjc36usalyhsfm3k9yyxjr0gkdm" },
  ETH:  { label: "Ethereum (ETH)",       address: "0xfaF93f0dD632Eeb7589023C01A22eA0e46E76990" },
  USDT: { label: "USDT (réseau TRC20)",  address: "TREMPLACE_MOI_PAR_TON_ADRESSE" }
};

// Taux indicatifs EUR -> crypto, à défaut d'API de cours en direct.
// Pense à les mettre à jour régulièrement (ou brancher une API de cours).
export const RATES_EUR = {
  BTC: 0.0000155,
  ETH: 0.00034,
  USDT: 1.08
};

/* ==========================================================================
   EmailJS — envoi de l'email de suivi de colis depuis le panel admin,
   sans backend. Crée un compte gratuit sur https://www.emailjs.com/,
   connecte ta boîte mail (Gmail, Outlook...), crée un template avec les
   variables {{to_email}}, {{order_number}}, {{tracking_number}}, {{customer_name}}.
   Public Key : Account > General. Service ID et Template ID : Email Services / Email Templates.
   ========================================================================== */
export const EMAILJS_CONFIG = {
  publicKey: "REMPLACE_MOI_PAR_TA_PUBLIC_KEY",
  serviceId: "REMPLACE_MOI_PAR_TON_SERVICE_ID",
  trackingTemplateId: "REMPLACE_MOI_PAR_TON_TEMPLATE_ID"
};
