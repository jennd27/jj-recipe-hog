/* DOM wiring: dynamic ingredient rows w/ autocomplete, search submit, results rendering. */

let dbHandle = null;
let ingredientNames = [];
let rowCounter = 0;

function ingredientRowHtml(rowId) {
  return `
    <div class="fields ingredient-row" data-row-id="${rowId}">
      <div class="four wide field">
        <input type="number" min="0" step="any" class="ingredient-amount" placeholder="Amount" />
      </div>
      <div class="five wide field">
        <select class="ui dropdown ingredient-unit">
          <option value="pcs">pcs</option>
          <option value="l">l</option>
          <option value="cup">cup</option>
          <option value="tbsp">tbsp</option>
          <option value="tsp">tsp</option>
        </select>
      </div>
      <div class="six wide field">
        <select class="ui search dropdown ingredient-name">
          <option value="">Ingredient</option>
        </select>
      </div>
      <div class="one wide field">
        <button type="button" class="ui icon button remove-row"><i class="times icon"></i></button>
      </div>
    </div>
  `;
}

function nameOptionsHtml() {
  return (
    '<option value="">Ingredient</option>' +
    ingredientNames.map((n) => `<option value="${n}">${n}</option>`).join('')
  );
}

function addIngredientRow() {
  rowCounter += 1;
  const $row = $(ingredientRowHtml(rowCounter));
  $('#ingredient-rows').append($row);
  $row.find('.ingredient-name').html(nameOptionsHtml());
  $row.find('.ui.dropdown').dropdown();
  $row.find('.remove-row').on('click', () => $row.remove());
}

function readHaveIngredients() {
  const have = [];
  $('.ingredient-row').each(function () {
    const $row = $(this);
    const amount = parseFloat($row.find('.ingredient-amount').val());
    const unit = $row.find('.ingredient-unit').val();
    const name = $row.find('.ingredient-name').val();
    if (name && !Number.isNaN(amount) && amount > 0) {
      have.push({ name, amount, unit });
    }
  });
  return have;
}

function statusLabel(status) {
  if (status === 'covered') return '<span class="ui green label">have enough</span>';
  if (status === 'insufficient') return '<span class="ui yellow label">need more</span>';
  return '<span class="ui red label">missing</span>';
}

function renderResults(ranked) {
  const $results = $('#results');
  if (ranked.length === 0) {
    $results.html('<div class="ui message">No recipes loaded.</div>');
    return;
  }

  const cards = ranked
    .map(({ recipe, breakdown }) => {
      const image = recipe.image
        ? `<img class="ui image" src="${recipe.image}" alt="${recipe.name}" />`
        : '';
      const items = breakdown
        .map(
          (b) =>
            `<div class="item">${statusLabel(b.status)} ${b.name} <span class="ingredient-req">(${b.required.amount} ${b.required.unit})</span></div>`
        )
        .join('');

      return `
        <div class="ui fluid card">
          ${image}
          <div class="content">
            <div class="header">${recipe.name}</div>
            <div class="meta"><a href="${recipe.url}" target="_blank" rel="noopener">Source recipe</a></div>
            <div class="description">
              <div class="ui list">${items}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  $results.html(`<div class="ui two stackable cards">${cards}</div>`);
}

async function handleSearchSubmit(event) {
  event.preventDefault();
  const have = readHaveIngredients();
  const recipes = await getAllRecipesWithIngredients(dbHandle);
  const ranked = rankRecipes(recipes, have);
  renderResults(ranked);
}

async function init() {
  $('#loading-message').text('Loading recipes into your browser database...');
  dbHandle = await ingestRecipes();
  ingredientNames = await getDistinctIngredientNames(dbHandle);
  $('#loading-message').hide();

  addIngredientRow();
  $('#add-ingredient-row').on('click', addIngredientRow);
  $('#search-form').on('submit', handleSearchSubmit);

  initConverter();
}

$(document).ready(() => {
  init().catch((err) => {
    console.error(err);
    $('#loading-message').text(`Failed to load recipes: ${err.message}`).addClass('error');
  });
});
