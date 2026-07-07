export const SEED_PRODUCTS = [
  {
    id: "R10",
    name: "Retatrutide 10mg",
    images :["R10.jpg"],
    cat: "Agoniste GLP-1",
    tagline: "Retatrutide / Perte de poids, coupe faim.",
    price: 65,
    stock: 0,
    maxStock: 30,
    dosage: "10mg / flacon",
    servings: "1 flacon",
    weightGrams: 6,
    accent: "#C8FF3D",
    lot: "GR-R10"
  },
   {
    id: "R20",
    name: "Retatrutide 20mg",
    images :["R20.jpg"],
    cat: "Agoniste GLP-1",
    tagline: "Retatrutide / Perte de poids, coupe faim.",
    price: 85,
    stock: 0,
    maxStock: 20,
    dosage: "20mg / flacon",
    servings: "1 flacon",
    weightGrams: 6,
    accent: "#C8FF3D",
    lot: "GR-R20"
  },
   {
    id: "R30",
    name: "Retatrutide 30mg",
    images :["R30.jpg"],
    cat: "Agoniste GLP-1",
    tagline: "Retatrutide / Perte de poids, coupe faim.",
    price: 110,
    stock: 2,
    maxStock: 20,
    dosage: "30mg / flacon",
    servings: "1 flacon",
    weightGrams: 6,
    accent: "#C8FF3D",
    lot: "GR-R30"
  },
  {
    id: "Ghkcu",
    name: "GHK-CU 100mg",
    images :["GHKCU.jpg"],
    cat: "Esthétisme",
    tagline: "GHK-CU / Meilleure qualité de peau/cheveux.",
    price: 50,
    stock: 27,
    maxStock: 30,
    dosage: "100mg / flacon",
    servings: "1 flacon",
    weightGrams: 6,
    accent: "#8FD1FF",
    lot: "GR-GHKQ"
  },
  {
    id: "MT2",
    name: "MT2 10mg",
    images :["mt2.jpg"],
    cat: "Esthétisme",
    tagline: "MT2 / Effet bronzant.",
    price: 60,
    stock: 19,
    maxStock: 20,
    dosage: "10mg / flacon",
    servings: "1 flacon",
    weightGrams: 6,
    accent: "#FFC24B",
    lot: "GR-MT2"
  },
  {
    id: "BAC WATER",
    name: "Bac Water 10mL",
    images :["BACW.jpg"],
    cat: "Recomposition",
    tagline: "Bac Water / Permet de reconstituer son peptide.",
    price: 4,
    stock: 49,
    maxStock: 50,
    dosage: "10mL / flacon",
    servings: "1 flacon",
    weightGrams: 24,
    accent: "#FF6B6B",
    lot: "GR-BACWAT"
  },
    {
    id: "AA WATER",
    name: "AA Water 10mL",
    images :["AA.jpg"],
    cat: "Recomposition",
    tagline: "AA Water / Permet de reconstituer son peptide (GHK-CU).",
    price: 4,
    stock: 29,
    maxStock: 30,
    dosage: "10mL / flacon",
    servings: "1 flacon",
    weightGrams: 24,
    accent: "#7BE0C8",
    lot: "GR-AAWAT"
  },
];

export function productSlides(p){
  const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;");
  const label = `
    <svg viewBox="0 0 220 260" width="100%" height="100%">
      <rect x="6" y="6" width="208" height="248" fill="none" stroke="${p.accent}" stroke-width="1.5"/>
      <rect x="6" y="6" width="208" height="46" fill="${p.accent}"/>
      <text x="18" y="34" font-family="Archivo Black, sans-serif" font-size="15" fill="#0B0B0C">NextGen Peptides.</text>
      <line x1="6" y1="70" x2="214" y2="70" stroke="#2C2E31"/>
      <text x="18" y="100" font-family="Archivo Black, sans-serif" font-size="14" fill="#EDEAE2">${esc(p.name).toUpperCase()}</text>
      <text x="18" y="122" font-family="monospace" font-size="9" fill="#B9B6AC">${esc(p.cat)}</text>
      <text x="18" y="150" font-family="monospace" font-size="9" fill="#B9B6AC">${esc(p.dosage)}</text>
      <text x="18" y="166" font-family="monospace" font-size="9" fill="#B9B6AC">${esc(p.servings)}</text>
      <circle cx="188" cy="220" r="18" fill="none" stroke="${p.accent}" stroke-width="1.5"/>
      <text x="188" y="224" font-family="monospace" font-size="8" fill="${p.accent}" text-anchor="middle">LOT</text>
    </svg>`;
  const spec = `
    <svg viewBox="0 0 220 260" width="100%" height="100%">
      <rect x="6" y="6" width="208" height="248" fill="none" stroke="#2C2E31" stroke-width="1.5"/>
      <text x="18" y="30" font-family="monospace" font-size="9" fill="${p.accent}">FICHE PRODUIT</text>
      <line x1="18" y1="40" x2="202" y2="40" stroke="#2C2E31"/>
      ${["Portion","Fréquence","Format","Réf. lot"].map((k,i)=>`
        <text x="18" y="${68+i*34}" font-family="monospace" font-size="8" fill="#B9B6AC">${k}</text>
        <text x="18" y="${68+i*34+14}" font-family="monospace" font-size="10" fill="#EDEAE2">${
          [p.dosage, "Quotidien", p.servings, p.lot][i]
        }</text>`).join("")}
    </svg>`;
  const stamp = `
    <svg viewBox="0 0 220 260" width="100%" height="100%">
      <rect x="6" y="6" width="208" height="248" fill="none" stroke="#2C2E31" stroke-width="1.5" stroke-dasharray="4 3"/>
      <g transform="translate(110,130) rotate(-14)">
        <circle r="52" fill="none" stroke="${p.accent}" stroke-width="2"/>
        <text y="-6" font-family="Archivo Black, sans-serif" font-size="11" fill="${p.accent}" text-anchor="middle">CONTRÔLÉ</text>
        <text y="12" font-family="monospace" font-size="9" fill="${p.accent}" text-anchor="middle">${p.lot}</text>
      </g>
      <text x="18" y="240" font-family="monospace" font-size="7" fill="#4A4E52">NextGen Peptides : usage sportif</text>
    </svg>`;
  const photo = p.images && p.images[0]
  ? `<img src="${p.images[0]}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
  : null;

return photo ? [photo, label, spec, stamp] : [label, spec, stamp];
}
