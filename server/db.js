/**
 * Fake data layer. Every call has realistic latency, as if it went to a database or a downstream
 * microservice.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getUser() {
  await sleep(300);
  return { id: 7, name: 'Alex', tier: 'gold' };
}

export async function getProducts() {
  await sleep(1000);
  return [
    { id: 1, name: 'Trail backpack 30L', price: 129 },
    { id: 2, name: 'Trekking poles', price: 59 },
    { id: 3, name: 'Waterproof jacket', price: 199 },
    { id: 4, name: 'Headlamp 400lm', price: 39 },
    { id: 5, name: 'Insulated bottle', price: 29 },
    { id: 6, name: 'Hiking boots', price: 169 },
  ];
}

export async function getRecommendations(userId) {
  await sleep(500);
  return [
    { id: 11, name: `Gold member pick for #${userId}: Ultralight tent`, price: 349 },
    { id: 12, name: 'Sleeping bag −5°C', price: 159 },
  ];
}
