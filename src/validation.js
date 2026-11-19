/**
 * @fileoverview Household validation and air-quality normalization for ClearAir.
 */

import { DEMO_LOCATIONS, getAirQualityForCity } from './locations.js';

/**
 * @typedef {Object} Household
 * @property {string}   city           - Selected demo city
 * @property {string}   householdSize  - '1–2 people' | '3–4 people' | '5+ people'
 * @property {string[]} sensitivities  - Selected sensitivity options
 * @property {string}   travelMode     - Main daily travel mode
 * @property {string}   outdoorTime    - Typical outdoor activity timing
 * @property {string[]} indoor         - Selected indoor environment options
 * @property {string}   priority       - User's main priority
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean}             valid      - Whether the household data is valid
 * @property {Record<string,string>} errors   - Field-level error messages
 * @property {Household}           normalized - Normalized household data (safe defaults for invalid fields)
 */

export const VALID_OPTIONS = {
  cities: Object.keys(DEMO_LOCATIONS),
  householdSizes: ['1–2 people', '3–4 people', '5+ people'],
  sensitivities: [
    'Child under 12',
    'Older adult',
    'Asthma or respiratory sensitivity',
    'Heart or cardiovascular sensitivity',
    'None of these',
  ],
  travelModes: [
    'Walk',
    'Cycle',
    'Public transit',
    'Private car',
    'Two-wheeler',
    'Work from home',
  ],
  outdoorTimes: ['Early morning', 'Midday', 'Evening', 'Flexible'],
  indoorOptions: [
    'Air purifier available',
    'Windows can be closed',
    'Mechanical ventilation available',
    'Cooking with gas',
    'Not sure',
  ],
  priorities: ['Lowest exposure', 'Lowest emissions', 'Lowest cost', 'Balanced option'],
};

export const DEFAULT_HOUSEHOLD = {
  city: 'Delhi',
  householdSize: '3–4 people',
  sensitivities: ['Child under 12'],
  travelMode: 'Private car',
  outdoorTime: 'Early morning',
  indoor: ['Windows can be closed'],
  priority: 'Balanced option',
};

/**
 * Strips control characters and trims whitespace from a string.
 *
 * @param {unknown} value - Input to sanitize
 * @returns {string} Cleaned string
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Validates raw household form data and returns errors + normalized values.
 *
 * @param {unknown} rawHousehold - Raw object from form or test
 * @returns {ValidationResult} Validation result with errors and normalized data
 */
export function validateHousehold(rawHousehold) {
  const input = rawHousehold && typeof rawHousehold === 'object' ? rawHousehold : {};
  const errors = /** @type {Record<string,string>} */ ({});

  const city = sanitizeText(/** @type {any} */ (input).city);
  const hasValidCity = VALID_OPTIONS.cities.includes(city);
  if (!hasValidCity) {
    errors.city = 'Please choose one of the available demo cities.';
  }

  const householdSize = sanitizeText(/** @type {any} */ (input).householdSize);
  const hasValidSize = VALID_OPTIONS.householdSizes.includes(householdSize);
  if (!hasValidSize) {
    errors.householdSize = 'Please select your household size.';
  }

  const rawSensitivities = Array.isArray(/** @type {any} */ (input).sensitivities)
    ? /** @type {any} */ (input).sensitivities
    : [];
  const sensitivities = rawSensitivities
    .map((item) => sanitizeText(item))
    .filter((item, index, arr) => VALID_OPTIONS.sensitivities.includes(item) && arr.indexOf(item) === index);
  if (sensitivities.length === 0) {
    errors.sensitivities = 'Select at least one sensitivity option, or choose "None of these".';
  } else if (sensitivities.includes('None of these') && sensitivities.length > 1) {
    errors.sensitivities = 'Choose either specific household sensitivities or "None of these".';
  }

  const travelMode = sanitizeText(/** @type {any} */ (input).travelMode);
  const hasValidTravel = VALID_OPTIONS.travelModes.includes(travelMode);
  if (!hasValidTravel) {
    errors.travelMode = 'Please select your main daily travel method.';
  }

  const outdoorTime = sanitizeText(/** @type {any} */ (input).outdoorTime);
  const hasValidOutdoor = VALID_OPTIONS.outdoorTimes.includes(outdoorTime);
  if (!hasValidOutdoor) {
    errors.outdoorTime = 'Please choose when outdoor activity usually happens.';
  }

  const rawIndoor = Array.isArray(/** @type {any} */ (input).indoor)
    ? /** @type {any} */ (input).indoor
    : [];
  const indoor = rawIndoor
    .map((item) => sanitizeText(item))
    .filter((item, index, arr) => VALID_OPTIONS.indoorOptions.includes(item) && arr.indexOf(item) === index);
  if (indoor.length === 0) {
    errors.indoor = 'Select at least one indoor environment condition, or choose "Not sure".';
  } else if (indoor.includes('Not sure') && indoor.length > 1) {
    errors.indoor = 'Choose either specific indoor conditions or "Not sure".';
  }

  const priority = sanitizeText(/** @type {any} */ (input).priority);
  const hasValidPriority = VALID_OPTIONS.priorities.includes(priority);
  if (!hasValidPriority) {
    errors.priority = 'Please select your main priority for today.';
  }

  const normalized = {
    city: hasValidCity ? city : DEFAULT_HOUSEHOLD.city,
    householdSize: hasValidSize ? householdSize : DEFAULT_HOUSEHOLD.householdSize,
    sensitivities: sensitivities.length > 0 ? sensitivities : [...DEFAULT_HOUSEHOLD.sensitivities],
    travelMode: hasValidTravel ? travelMode : DEFAULT_HOUSEHOLD.travelMode,
    outdoorTime: hasValidOutdoor ? outdoorTime : DEFAULT_HOUSEHOLD.outdoorTime,
    indoor: indoor.length > 0 ? indoor : [...DEFAULT_HOUSEHOLD.indoor],
    priority: hasValidPriority ? priority : DEFAULT_HOUSEHOLD.priority,
  };

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized,
  };
}

/**
 * Merges a partial airQuality object with the nearest demo city baseline,
 * deriving severity from AQI/PM2.5 when not explicitly provided.
 *
 * @param {unknown}  airQuality   - Partial or full AirQuality object
 * @param {string}   fallbackCity - City to use when airQuality has no city field
 * @returns {import('./locations.js').AirQuality} Fully normalized AirQuality object
 */
export function normalizeAirQuality(airQuality, fallbackCity) {
  if (!airQuality || typeof airQuality !== 'object') {
    return getAirQualityForCity(fallbackCity);
  }
  const aq = /** @type {any} */ (airQuality);
  const base = getAirQualityForCity(aq.city || fallbackCity);
  const aqi = Number.isFinite(Number(aq.aqi)) ? Number(aq.aqi) : base.aqi;
  const pm25 = Number.isFinite(Number(aq.pm25)) ? Number(aq.pm25) : base.pm25;
  const pm10 = Number.isFinite(Number(aq.pm10)) ? Number(aq.pm10) : base.pm10;
  const severity = ['Severe', 'Poor', 'Moderate'].includes(aq.severity)
    ? aq.severity
    : aqi >= 200 || pm25 >= 120
      ? 'Severe'
      : aqi >= 101 || pm25 >= 45
        ? 'Poor'
        : 'Moderate';

  return {
    ...base,
    city: sanitizeText(aq.city) || base.city,
    aqi,
    pm25,
    pm10,
    temperatureC: Number.isFinite(Number(aq.temperatureC)) ? Number(aq.temperatureC) : base.temperatureC,
    wind: sanitizeText(aq.wind) || base.wind,
    severity,
    interpretation: sanitizeText(aq.interpretation) || base.interpretation,
    cleanerWindow: sanitizeText(aq.cleanerWindow) || base.cleanerWindow,
    peakSmogWindows: sanitizeText(aq.peakSmogWindows) || base.peakSmogWindows,
    isDemo: aq.isDemo !== undefined ? Boolean(aq.isDemo) : base.isDemo,
    isFallback: aq.isFallback !== undefined ? Boolean(aq.isFallback) : base.isFallback,
  };
}
