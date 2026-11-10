// Shared demo data for the INP case: a catalogue of 3000 products and a helper that simulates
// synchronous "heavy" work (e.g. a third-party analytics SDK, JSON serialization of a big state, etc).
window.CATALOG = (function () {
  var adjectives = ['Light', 'Pro', 'Ultra', 'Classic', 'Trail', 'Alpine', 'Urban', 'Storm', 'Compact', 'Thermal'];
  var nouns = ['backpack', 'jacket', 'tent', 'boots', 'poles', 'headlamp', 'bottle', 'gloves', 'stove', 'map'];
  var items = [];
  for (var i = 0; i < 3000; i++) {
    items.push({
      id: i,
      name: adjectives[i % 10] + ' ' + nouns[Math.floor(i / 10) % 10] + ' #' + i,
      price: 10 + ((i * 37) % 290),
    });
  }
  return items;
})();

// Blocks the main thread for `ms` milliseconds.
window.blockFor = function (ms) {
  var end = performance.now() + ms;
  while (performance.now() < end) {
    /* busy */
  }
};
