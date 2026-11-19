/**
 * app.js — Public re-export facade for ClearAir.
 *
 * The implementation has been split into focused ES modules under src/.
 * This file re-exports every symbol that test.js and index.html depend on,
 * so external consumers need no import-path changes.
 *
 * Module map:
 *   src/locations.js   — DEMO_LOCATIONS, getAirQualityForCity
 *   src/validation.js  — VALID_OPTIONS, DEFAULT_HOUSEHOLD, sanitizeText,
 *                         validateHousehold, normalizeAirQuality
 *   src/plan-engine.js — generatePlan, RULE_SCORES
 *   src/assistant.js   — answerQuestion
 *   src/render.js      — renderAirQuality, renderPlan, renderAssistantResponse
 *   src/main.js        — initClearAirApp (browser bootstrap, self-invokes)
 */

export { DEMO_LOCATIONS, getAirQualityForCity } from './src/locations.js';

export {
  VALID_OPTIONS,
  DEFAULT_HOUSEHOLD,
  sanitizeText,
  validateHousehold,
  normalizeAirQuality,
} from './src/validation.js';

export { generatePlan, RULE_SCORES } from './src/plan-engine.js';

export { answerQuestion } from './src/assistant.js';

export {
  appendDefinitionRow,
  renderAirQuality,
  renderPlan,
  renderAssistantResponse,
} from './src/render.js';

// Bootstrap the browser app when running in a document context.
// The import itself triggers the self-executing guard inside main.js.
if (typeof document !== 'undefined') {
  import('./src/main.js');
}
