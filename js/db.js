/* IndexedDB layer: schema open/upgrade + clear-and-repopulate ingest. */

const DB_NAME = 'RecipeAppDB';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('recipes')) {
        db.createObjectStore('recipes', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('ingredients')) {
        const store = db.createObjectStore('ingredients', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('recipeId', 'recipeId', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };

    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error);
  });
}

function clearStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Replace all recipes/ingredients in the DB with the given recipe list.
 * recipes: [{ id, name, url, image, procedure, ingredients: [{name, amount, unit}] }]
 */
async function repopulateDb(db, recipes) {
  await clearStore(db, 'recipes');
  await clearStore(db, 'ingredients');

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['recipes', 'ingredients'], 'readwrite');
    const recipeStore = tx.objectStore('recipes');
    const ingredientStore = tx.objectStore('ingredients');

    for (const recipe of recipes) {
      recipeStore.put({
        id: recipe.id,
        name: recipe.name,
        url: recipe.url,
        image: recipe.image || null,
        procedure: recipe.procedure,
      });

      for (const ing of recipe.ingredients) {
        ingredientStore.put({
          recipeId: recipe.id,
          name: ing.name.trim().toLowerCase(),
          amount: ing.amount,
          unit: ing.unit,
        });
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event.target.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (event) => reject(event.target.error);
  });
}

async function getAllRecipesWithIngredients(db) {
  const [recipes, ingredients] = await Promise.all([
    getAllFromStore(db, 'recipes'),
    getAllFromStore(db, 'ingredients'),
  ]);

  const byRecipeId = new Map();
  for (const ing of ingredients) {
    if (!byRecipeId.has(ing.recipeId)) byRecipeId.set(ing.recipeId, []);
    byRecipeId.get(ing.recipeId).push(ing);
  }

  return recipes.map((r) => ({
    ...r,
    ingredients: byRecipeId.get(r.id) || [],
  }));
}

async function getDistinctIngredientNames(db) {
  const ingredients = await getAllFromStore(db, 'ingredients');
  return [...new Set(ingredients.map((i) => i.name))].sort();
}
