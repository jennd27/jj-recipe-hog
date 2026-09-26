/* Repopulates IndexedDB from the RECIPES global (defined in data/recipes.js,
   loaded via a <script> tag) on every page load. */

async function ingestRecipes() {
  const db = await openDb();
  await repopulateDb(db, RECIPES);
  return db;
}
