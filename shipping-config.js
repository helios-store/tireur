/* ==========================================================================
   Frais de port Mondial Relay — grille par palier de poids.
   Adapte les paliers/prix à ton contrat Mondial Relay réel
   (Point Relais, Locker, etc. — les tarifs varient selon le type de point
   et ton volume mensuel). Poids en grammes.
   ========================================================================== */

export const PACKAGING_WEIGHT_G = 80; // poids moyen du carton + calage, ajusté à ton emballage réel

export const MONDIAL_RELAY_TIERS = [
  { maxWeight: 500,   price: 4.20 },
  { maxWeight: 1000,  price: 5.20 },
  { maxWeight: 2000,  price: 6.90 },
  { maxWeight: 5000,  price: 9.90 },
  { maxWeight: 10000, price: 13.90 },
  { maxWeight: 30000, price: 19.90 }
];

/**
 * Calcule le poids total du panier (grammes), emballage inclus.
 * @param {Array<{id:string, qty:number}>} cart
 * @param {Array<object>} products - liste PRODUCTS (avec weightGrams)
 */
export function cartWeightGrams(cart, products){
  const itemsWeight = cart.reduce((sum, line) => {
    const p = products.find(x => x.id === line.id);
    const w = p?.weightGrams || 0;
    return sum + w * line.qty;
  }, 0);
  return itemsWeight + PACKAGING_WEIGHT_G;
}

/**
 * Retourne le tarif Mondial Relay pour un poids donné (grammes).
 * Si le poids dépasse le dernier palier, on retombe sur le tarif le plus élevé
 * (à toi de vérifier si un fractionnement en 2 colis est plus économique au-delà).
 */
export function shippingPriceFor(weightGrams){
  const tier = MONDIAL_RELAY_TIERS.find(t => weightGrams <= t.maxWeight);
  return tier ? tier.price : MONDIAL_RELAY_TIERS[MONDIAL_RELAY_TIERS.length - 1].price;
}
