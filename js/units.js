/* Shared unit conversion helpers.
   Allowed recipe/search units: l, tbsp, cup, tsp, pcs (US customary volumes).
   pcs is a bare count and is never converted. */

const ML_PER_UNIT = {
  l: 1000,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

const VOLUME_UNITS = Object.keys(ML_PER_UNIT);
const ALL_UNITS = [...VOLUME_UNITS, 'pcs'];

function isVolumeUnit(unit) {
  return Object.prototype.hasOwnProperty.call(ML_PER_UNIT, unit);
}

/** Convert an amount in a volume unit to milliliters. Returns null for 'pcs'. */
function toBaseVolumeMl(amount, unit) {
  if (!isVolumeUnit(unit)) return null;
  return amount * ML_PER_UNIT[unit];
}

/** Convert milliliters to an amount in the given volume unit. Returns null for 'pcs'. */
function fromBaseVolumeMl(ml, unit) {
  if (!isVolumeUnit(unit)) return null;
  return ml / ML_PER_UNIT[unit];
}

/** Convert grams to milliliters assuming water density (1 g ~= 1 ml). */
function gramsToMl(grams) {
  return grams;
}
