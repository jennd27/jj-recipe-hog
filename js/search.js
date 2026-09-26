/* Ranking algorithm: given ingredients the user has, score & sort all recipes
   by how completely they're covered. */

/**
 * @param {Array<{id, name, url, image, procedure, ingredients: Array<{name, amount, unit}>}>} recipes
 * @param {Array<{name, amount, unit}>} have  - what the user typed into the search form
 * @returns {Array<{recipe, shortageCount, shortageScore, breakdown}>} sorted best-match first
 */
function rankRecipes(recipes, have) {
  const haveByName = new Map();
  for (const h of have) {
    const key = h.name.trim().toLowerCase();
    haveByName.set(key, { amount: Number(h.amount), unit: h.unit });
  }

  const results = recipes.map((recipe) => {
    let shortageCount = 0; // # ingredients missing or insufficient
    let shortageScore = 0; // sum of normalized deficits (deficit / required)
    const breakdown = [];

    for (const req of recipe.ingredients) {
      const key = req.name.trim().toLowerCase();
      const owned = haveByName.get(key);

      if (!owned) {
        shortageCount += 1;
        shortageScore += 1; // fully missing = 100% deficit
        breakdown.push({ name: req.name, status: 'missing', required: req, have: null });
        continue;
      }

      const sameCategory =
        (req.unit === 'pcs' && owned.unit === 'pcs') ||
        (isVolumeUnit(req.unit) && isVolumeUnit(owned.unit));

      if (!sameCategory) {
        // Can't safely compare a count against a volume - treat conservatively as missing.
        shortageCount += 1;
        shortageScore += 1;
        breakdown.push({ name: req.name, status: 'missing', required: req, have: owned, reason: 'unit-mismatch' });
        continue;
      }

      const requiredAmount = req.unit === 'pcs' ? req.amount : toBaseVolumeMl(req.amount, req.unit);
      const haveAmount = owned.unit === 'pcs' ? owned.amount : toBaseVolumeMl(owned.amount, owned.unit);
      const deficit = Math.max(0, requiredAmount - haveAmount);

      if (deficit > 0) {
        shortageCount += 1;
        shortageScore += deficit / requiredAmount;
        breakdown.push({ name: req.name, status: 'insufficient', required: req, have: owned });
      } else {
        breakdown.push({ name: req.name, status: 'covered', required: req, have: owned });
      }
    }

    return { recipe, shortageCount, shortageScore, breakdown };
  });

  results.sort((a, b) => {
    if (a.shortageCount !== b.shortageCount) return a.shortageCount - b.shortageCount;
    return a.shortageScore - b.shortageScore;
  });

  return results;
}
