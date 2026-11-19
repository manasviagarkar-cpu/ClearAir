/**
 * @fileoverview App initialization and event wiring for ClearAir.
 *
 * This module runs only in a browser context (guarded by `typeof document`).
 */

import { DEFAULT_HOUSEHOLD, validateHousehold } from './validation.js';
import { getAirQualityForCity } from './locations.js';
import { generatePlan } from './plan-engine.js';
import { answerQuestion } from './assistant.js';
import { renderAirQuality, renderPlan, renderAssistantResponse } from './render.js';

const MAX_QUESTION_LENGTH = 300;

/**
 * @returns {import('./validation.js').Household}
 */
function cloneDefaultHousehold() {
  return {
    ...DEFAULT_HOUSEHOLD,
    sensitivities: [...DEFAULT_HOUSEHOLD.sensitivities],
    indoor: [...DEFAULT_HOUSEHOLD.indoor],
  };
}

/**
 * Initializes the ClearAir browser app: queries DOM elements, wires event
 * listeners, and renders the initial plan.
 *
 * @returns {void}
 */
export function initClearAirApp() {
  const sessionState = {
    household: cloneDefaultHousehold(),
    airQuality: getAirQualityForCity(DEFAULT_HOUSEHOLD.city),
    lastQuestion: '',
  };

  // --- DOM element references ---
  const contextCitySelect = /** @type {HTMLSelectElement} */ (document.getElementById('context-city-select'));
  const householdCitySelect = /** @type {HTMLSelectElement} */ (document.getElementById('household-city'));
  const aqSeverityPanel = /** @type {HTMLElement} */ (document.getElementById('aq-severity-panel'));
  const aqSeveritySymbol = /** @type {HTMLElement} */ (document.getElementById('aq-severity-symbol'));
  const aqSeverityText = /** @type {HTMLElement} */ (document.getElementById('aq-severity-text'));
  const aqInterpretation = /** @type {HTMLElement} */ (document.getElementById('aq-interpretation'));
  const aqAqi = /** @type {HTMLElement} */ (document.getElementById('aq-aqi'));
  const aqPm25 = /** @type {HTMLElement} */ (document.getElementById('aq-pm25'));
  const aqPm10 = /** @type {HTMLElement} */ (document.getElementById('aq-pm10'));
  const aqTemp = /** @type {HTMLElement} */ (document.getElementById('aq-temp'));
  const aqWind = /** @type {HTMLElement} */ (document.getElementById('aq-wind'));

  const householdForm = /** @type {HTMLFormElement} */ (document.getElementById('household-form'));
  const mainTravelSelect = /** @type {HTMLSelectElement} */ (document.getElementById('main-travel'));
  const outdoorActivitySelect = /** @type {HTMLSelectElement} */ (document.getElementById('outdoor-activity'));
  const resetProfileBtn = /** @type {HTMLButtonElement} */ (document.getElementById('reset-profile-btn'));
  const formErrorSummary = /** @type {HTMLElement} */ (document.getElementById('form-error-summary'));
  const planSection = /** @type {HTMLElement} */ (document.getElementById('plan-section'));
  const planLiveRegion = /** @type {HTMLElement} */ (document.getElementById('plan-live-region'));
  const planCount = /** @type {HTMLElement} */ (document.getElementById('plan-count'));
  const planSafetyBanner = /** @type {HTMLElement} */ (document.getElementById('plan-safety-banner'));
  const planSafetyText = /** @type {HTMLElement} */ (document.getElementById('plan-safety-text'));
  const planList = /** @type {HTMLElement} */ (document.getElementById('plan-list'));

  const whyPrioritySummary = /** @type {HTMLElement} */ (document.getElementById('why-priority-summary'));
  const whyTradeoffSummary = /** @type {HTMLElement} */ (document.getElementById('why-tradeoff-summary'));
  const signalsList = /** @type {HTMLElement} */ (document.getElementById('signals-list'));
  const alternativesGrid = /** @type {HTMLElement} */ (document.getElementById('alternatives-grid'));

  const assistantForm = /** @type {HTMLFormElement} */ (document.getElementById('assistant-form'));
  const assistantInput = /** @type {HTMLInputElement} */ (document.getElementById('assistant-input'));
  const assistantCharCount = /** @type {HTMLElement} */ (document.getElementById('assistant-char-count'));
  const assistantCharStatus = /** @type {HTMLElement} */ (document.getElementById('assistant-char-status'));
  const assistantError = /** @type {HTMLElement} */ (document.getElementById('assistant-error'));
  const assistantOutput = /** @type {HTMLElement} */ (document.getElementById('assistant-output'));
  const quickButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.quick-btn'));

  // Shared element bundles for renderer functions
  const aqEls = {
    panel: aqSeverityPanel,
    symbol: aqSeveritySymbol,
    text: aqSeverityText,
    interp: aqInterpretation,
    aqi: aqAqi,
    pm25: aqPm25,
    pm10: aqPm10,
    temp: aqTemp,
    wind: aqWind,
  };

  const planEls = {
    planCount,
    safetyBanner: planSafetyBanner,
    safetyText: planSafetyText,
    planList,
    prioritySummary: whyPrioritySummary,
    tradeoffSummary: whyTradeoffSummary,
    signalsList,
    alternativesGrid,
  };

  let assistantTimerId = /** @type {ReturnType<typeof setTimeout>|null} */ (null);

  /** @returns {boolean} */
  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia) &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  const fieldControlMap = {
    city: {
      label: 'City or location',
      target: householdCitySelect,
      getFocusEl: () => householdCitySelect,
    },
    householdSize: {
      label: 'Household size',
      target: document.getElementById('fieldset-householdSize'),
      getFocusEl: () => householdForm.querySelector('input[name="householdSize"]'),
    },
    sensitivities: {
      label: 'Household sensitivities',
      target: document.getElementById('fieldset-sensitivities'),
      getFocusEl: () => householdForm.querySelector('input[name="sensitivities"]'),
    },
    travelMode: {
      label: 'Main daily travel',
      target: mainTravelSelect,
      getFocusEl: () => mainTravelSelect,
    },
    outdoorTime: {
      label: 'Typical outdoor activity',
      target: outdoorActivitySelect,
      getFocusEl: () => outdoorActivitySelect,
    },
    indoor: {
      label: 'Indoor environment',
      target: document.getElementById('fieldset-indoor'),
      getFocusEl: () => householdForm.querySelector('input[name="indoor"]'),
    },
    priority: {
      label: 'Main priority',
      target: document.getElementById('fieldset-priority'),
      getFocusEl: () => householdForm.querySelector('input[name="priority"]'),
    },
  };

  // --- Helper functions ---

  /** @param {string} key */
  function clearFieldError(key) {
    const el = document.getElementById(`error-${key}`);
    if (el) {
      el.hidden = true;
      el.textContent = '';
    }
    const mapping = fieldControlMap[key];
    if (mapping && mapping.target) {
      mapping.target.removeAttribute('aria-invalid');
    }
  }

  function clearFormErrors() {
    formErrorSummary.hidden = true;
    formErrorSummary.replaceChildren();
    Object.keys(fieldControlMap).forEach((key) => {
      clearFieldError(key);
    });
  }

  /** @param {Record<string,string>} errors */
  function showFormErrors(errors) {
    const messages = Object.entries(errors);
    const summaryFragment = document.createDocumentFragment();

    const title = document.createElement('p');
    title.className = 'error-summary-title';
    title.textContent = `Please fix ${messages.length} ${
      messages.length === 1 ? 'field' : 'fields'
    } before building your plan:`;
    summaryFragment.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'error-summary-list';

    messages.forEach(([key, msg]) => {
      const mapping = Object.prototype.hasOwnProperty.call(fieldControlMap, key)
        ? fieldControlMap[key]
        : null;
      const el = mapping ? document.getElementById(`error-${key}`) : null;
      if (el) {
        el.hidden = false;
        el.textContent = msg;
      }
      if (mapping && mapping.target) {
        mapping.target.setAttribute('aria-invalid', 'true');
      }

      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'error-summary-link';
      link.href = `#error-${encodeURIComponent(key)}`;
      link.textContent = `${mapping ? mapping.label : key}: ${msg}`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const focusEl = mapping && mapping.getFocusEl ? mapping.getFocusEl() : null;
        if (focusEl) {
          focusEl.focus();
        }
      });
      li.appendChild(link);
      list.appendChild(li);
    });

    summaryFragment.appendChild(list);
    formErrorSummary.replaceChildren(summaryFragment);
    formErrorSummary.hidden = false;
    formErrorSummary.focus({ preventScroll: true });
    formErrorSummary.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }

  /**
   * @param {string}      groupName
   * @param {string}      exclusiveValue
   * @param {HTMLInputElement} changedInput
   */
  function syncCheckboxExclusivity(groupName, exclusiveValue, changedInput) {
    const checkboxes = Array.from(
      householdForm.querySelectorAll(`input[name="${groupName}"]`)
    );
    if (changedInput.value === exclusiveValue && changedInput.checked) {
      checkboxes.forEach((cb) => {
        if (cb.value !== exclusiveValue) {
          /** @type {HTMLInputElement} */ (cb).checked = false;
        }
      });
    } else if (changedInput.value !== exclusiveValue && changedInput.checked) {
      checkboxes.forEach((cb) => {
        if (cb.value === exclusiveValue) {
          /** @type {HTMLInputElement} */ (cb).checked = false;
        }
      });
    }
  }

  function setFormToDefaults() {
    householdCitySelect.value = DEFAULT_HOUSEHOLD.city;
    contextCitySelect.value = DEFAULT_HOUSEHOLD.city;

    householdForm.querySelectorAll('input[name="householdSize"]').forEach((input) => {
      /** @type {HTMLInputElement} */ (input).checked = input.value === DEFAULT_HOUSEHOLD.householdSize;
    });
    householdForm.querySelectorAll('input[name="sensitivities"]').forEach((input) => {
      /** @type {HTMLInputElement} */ (input).checked = DEFAULT_HOUSEHOLD.sensitivities.includes(input.value);
    });
    mainTravelSelect.value = DEFAULT_HOUSEHOLD.travelMode;
    outdoorActivitySelect.value = DEFAULT_HOUSEHOLD.outdoorTime;
    householdForm.querySelectorAll('input[name="indoor"]').forEach((input) => {
      /** @type {HTMLInputElement} */ (input).checked = DEFAULT_HOUSEHOLD.indoor.includes(input.value);
    });
    householdForm.querySelectorAll('input[name="priority"]').forEach((input) => {
      /** @type {HTMLInputElement} */ (input).checked = input.value === DEFAULT_HOUSEHOLD.priority;
    });
  }

  /** @returns {Object} Raw form values */
  function readFormValues() {
    const formData = new FormData(householdForm);
    return {
      city: formData.get('city') || '',
      householdSize: formData.get('householdSize') || '',
      sensitivities: formData.getAll('sensitivities'),
      travelMode: formData.get('travelMode') || '',
      outdoorTime: formData.get('outdoorTime') || '',
      indoor: formData.getAll('indoor'),
      priority: formData.get('priority') || '',
    };
  }

  /** @param {string} rawQuestion */
  function askAssistant(rawQuestion) {
    if (assistantTimerId !== null) {
      clearTimeout(assistantTimerId);
      assistantTimerId = null;
    }

    const result = answerQuestion({
      question: rawQuestion,
      household: sessionState.household,
      airQuality: sessionState.airQuality,
    });

    if (!result.valid) {
      assistantError.hidden = false;
      assistantError.textContent = result.error || '';
      assistantInput.setAttribute('aria-invalid', 'true');
      assistantInput.focus();
      return;
    }

    assistantError.hidden = true;
    assistantError.textContent = '';
    assistantInput.removeAttribute('aria-invalid');
    sessionState.lastQuestion = result.question || '';

    if (prefersReducedMotion()) {
      assistantOutput.removeAttribute('aria-busy');
      renderAssistantResponse(result, assistantOutput);
      return;
    }

    assistantOutput.setAttribute('aria-busy', 'true');
    const loading = document.createElement('p');
    loading.className = 'assistant-loading';
    loading.textContent = `Checking ${sessionState.airQuality.city} conditions and your household context…`;
    assistantOutput.replaceChildren(loading);

    assistantTimerId = setTimeout(() => {
      assistantTimerId = null;
      assistantOutput.removeAttribute('aria-busy');
      renderAssistantResponse(result, assistantOutput);
    }, 140);
  }

  /** @param {string} city */
  function syncAndRenderPlan(city) {
    if (assistantTimerId !== null) {
      clearTimeout(assistantTimerId);
      assistantTimerId = null;
      assistantOutput.removeAttribute('aria-busy');
    }

    const aq = getAirQualityForCity(city);
    sessionState.airQuality = aq;
    sessionState.household.city = aq.city;
    contextCitySelect.value = aq.city;
    householdCitySelect.value = aq.city;
    renderAirQuality(aq, aqEls);

    const planResult = generatePlan({
      household: sessionState.household,
      airQuality: sessionState.airQuality,
    });
    renderPlan(planResult, planEls);

    if (sessionState.lastQuestion) {
      const refreshed = answerQuestion({
        question: sessionState.lastQuestion,
        household: sessionState.household,
        airQuality: sessionState.airQuality,
      });
      if (refreshed.valid) {
        renderAssistantResponse(refreshed, assistantOutput);
      }
    }

    return planResult;
  }

  /**
   * @param {string}  city
   * @param {boolean} announce
   */
  function updateCityContext(city, announce) {
    syncAndRenderPlan(city);
    if (announce) {
      const aq = sessionState.airQuality;
      planLiveRegion.textContent = `Updated air-quality context and plan for ${aq.city} (${aq.severity}, AQI ${aq.aqi}).`;
    }
  }

  // --- Event listeners ---
  contextCitySelect.addEventListener('change', (event) => {
    clearFieldError('city');
    updateCityContext(/** @type {HTMLSelectElement} */ (event.target).value, true);
  });

  householdCitySelect.addEventListener('change', (event) => {
    clearFieldError('city');
    updateCityContext(/** @type {HTMLSelectElement} */ (event.target).value, true);
  });

  householdForm.addEventListener('change', (event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    if (target.name === 'sensitivities') {
      syncCheckboxExclusivity('sensitivities', 'None of these', target);
    } else if (target.name === 'indoor') {
      syncCheckboxExclusivity('indoor', 'Not sure', target);
    }

    const mapping =
      target.name && Object.prototype.hasOwnProperty.call(fieldControlMap, target.name)
        ? fieldControlMap[target.name]
        : null;
    if (mapping && (mapping.target?.hasAttribute('aria-invalid') || !formErrorSummary.hidden)) {
      const validation = validateHousehold(readFormValues());
      if (!validation.errors[target.name]) {
        clearFieldError(target.name);
        if (Object.keys(validation.errors).length === 0 && !formErrorSummary.hidden) {
          clearFormErrors();
        }
      }
    }
  });

  householdForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormErrors();

    const raw = readFormValues();
    const validation = validateHousehold(raw);

    if (!validation.valid) {
      showFormErrors(validation.errors);
      return;
    }

    sessionState.household = validation.normalized;
    const planResult = syncAndRenderPlan(validation.normalized.city);

    planLiveRegion.textContent = `Personalized daily plan updated for ${sessionState.airQuality.city} with ${planResult.recommendations.length} recommendations.`;

    planSection.focus({ preventScroll: true });
    planSection.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  });

  resetProfileBtn.addEventListener('click', () => {
    clearFormErrors();
    setFormToDefaults();
    sessionState.household = cloneDefaultHousehold();
    updateCityContext(DEFAULT_HOUSEHOLD.city, false);
    planLiveRegion.textContent = `Household profile reset to defaults for ${sessionState.airQuality.city} (${sessionState.airQuality.severity}, AQI ${sessionState.airQuality.aqi}).`;
  });

  assistantInput.addEventListener('input', () => {
    const len = assistantInput.value.length;
    assistantCharCount.textContent = `${len} / ${MAX_QUESTION_LENGTH}`;
    const remaining = MAX_QUESTION_LENGTH - len;
    if (remaining === 30 || remaining === 10 || remaining === 0) {
      assistantCharStatus.textContent =
        remaining === 0
          ? `Maximum ${MAX_QUESTION_LENGTH} characters reached.`
          : `${remaining} characters remaining.`;
    } else if (assistantCharStatus.textContent) {
      assistantCharStatus.textContent = '';
    }
    if (!assistantError.hidden && len > 0 && len <= MAX_QUESTION_LENGTH) {
      assistantError.hidden = true;
      assistantError.textContent = '';
      assistantInput.removeAttribute('aria-invalid');
    }
  });

  assistantForm.addEventListener('submit', (event) => {
    event.preventDefault();
    askAssistant(assistantInput.value);
  });

  quickButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = (btn.getAttribute('data-question') || btn.textContent || '').trim();
      assistantInput.value = q;
      assistantCharCount.textContent = `${q.length} / ${MAX_QUESTION_LENGTH}`;
      askAssistant(q);
    });
  });

  // Initial render
  syncAndRenderPlan(DEFAULT_HOUSEHOLD.city);
}

// Bootstrap in browser only
if (typeof document !== 'undefined') {
  initClearAirApp();
}
