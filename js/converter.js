/* Standalone g/ml -> cup/tbsp/tsp/l converter widget. Assumes water density (1 g ~= 1 ml). */

function initConverter() {
  const $form = $('#converter-form');
  const $amount = $('#converter-amount');
  const $inputUnit = $('#converter-input-unit');
  const $results = $('#converter-results');

  function render() {
    const amount = parseFloat($amount.val());
    if (Number.isNaN(amount) || amount <= 0) {
      $results.html('<div class="ui message">Enter a value in grams or ml to convert.</div>');
      return;
    }

    const inputUnit = $inputUnit.val(); // 'g' or 'ml'
    const ml = inputUnit === 'g' ? gramsToMl(amount) : amount;

    const rows = VOLUME_UNITS.map((unit) => {
      const converted = fromBaseVolumeMl(ml, unit);
      return `<tr><td>${unit}</td><td>${converted.toFixed(2)}</td></tr>`;
    }).join('');

    $results.html(`
      <table class="ui very basic compact table">
        <thead><tr><th>Unit</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="ui small message">
        Approximation assuming water density (1 g &asymp; 1 ml). Accurate for liquids; less accurate for dry/dense ingredients like flour or sugar.
      </div>
    `);
  }

  $form.on('input change', render);
  render();
}
