/**
 * @fileoverview DOM rendering functions for ClearAir.
 *
 * All rendering uses textContent / createElement / DocumentFragment — no innerHTML.
 */

/**
 * Appends a <dt>/<dd> pair inside a wrapper <div> to a definition list or fragment.
 *
 * @param {HTMLDListElement|DocumentFragment} dl          - Target DL or fragment
 * @param {string}                             term        - Term text
 * @param {string}                             description - Description text
 * @param {string}                             [className] - Optional wrapper class
 * @returns {void}
 */
export function appendDefinitionRow(dl, term, description, className) {
  const wrap = document.createElement('div');
  if (className) {
    wrap.className = className;
  }
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = description;
  wrap.appendChild(dt);
  wrap.appendChild(dd);
  dl.appendChild(wrap);
}

/**
 * Renders the air-quality summary panel (severity badge + metrics).
 *
 * @param {import('./locations.js').AirQuality} aq            - Air quality data
 * @param {Object}                               els           - Pre-queried DOM elements
 * @param {Element}                              els.panel     - Severity panel element
 * @param {Element}                              els.symbol    - Severity symbol span
 * @param {Element}                              els.text      - Severity text span
 * @param {Element}                              els.interp    - Interpretation paragraph
 * @param {Element}                              els.aqi       - AQI value element
 * @param {Element}                              els.pm25      - PM2.5 value element
 * @param {Element}                              els.pm10      - PM10 value element
 * @param {Element}                              els.temp      - Temperature element
 * @param {Element}                              els.wind      - Wind element
 * @returns {void}
 */
export function renderAirQuality(aq, els) {
  const symbolMap = { Severe: '!!', Poor: '!', Moderate: '~' };
  els.panel.setAttribute('data-severity', aq.severity);
  els.symbol.textContent = symbolMap[aq.severity] || '!';
  els.text.textContent = `Severity: ${aq.severity}`;
  els.interp.textContent = aq.interpretation;
  els.aqi.textContent = String(aq.aqi);
  els.pm25.textContent = `${aq.pm25} µg/m³`;
  els.pm10.textContent = `${aq.pm10} µg/m³`;
  els.temp.textContent = `${aq.temperatureC}°C`;
  els.wind.textContent = aq.wind;
}

/**
 * Renders the full plan result into the plan section.
 *
 * @param {import('./plan-engine.js').PlanResult} planResult - Generated plan
 * @param {Object}                                els        - Pre-queried DOM elements
 * @param {Element}                               els.planCount
 * @param {Element}                               els.safetyBanner
 * @param {Element}                               els.safetyText
 * @param {Element}                               els.planList
 * @param {Element}                               els.prioritySummary
 * @param {Element}                               els.tradeoffSummary
 * @param {Element}                               els.signalsList
 * @param {Element}                               els.alternativesGrid
 * @returns {void}
 */
export function renderPlan(planResult, els) {
  els.planCount.textContent = `${planResult.recommendations.length} steps`;

  if (planResult.safetyCaveat) {
    els.safetyBanner.hidden = false;
    els.safetyText.textContent = planResult.safetyCaveat;
  } else {
    els.safetyBanner.hidden = true;
    els.safetyText.textContent = '';
  }

  const planFragment = document.createDocumentFragment();
  planResult.recommendations.forEach((rec) => {
    const li = document.createElement('li');
    li.className = 'plan-item';

    const top = document.createElement('div');
    top.className = 'plan-item-top';

    const labelEl = document.createElement('span');
    labelEl.className = 'plan-item-label';
    labelEl.textContent = rec.label;

    const confEl = document.createElement('span');
    confEl.className = 'plan-item-confidence';
    confEl.textContent = rec.confidence;

    top.appendChild(labelEl);
    top.appendChild(confEl);

    const actionEl = document.createElement('h3');
    actionEl.className = 'plan-item-action';
    actionEl.textContent = rec.action;

    const whyEl = document.createElement('p');
    whyEl.className = 'plan-item-why';
    whyEl.textContent = rec.whyItMatters;

    const details = document.createElement('dl');
    details.className = 'plan-item-details';
    appendDefinitionRow(details, 'Direct impact', rec.directImpact, 'plan-detail');
    appendDefinitionRow(details, 'Tradeoff', rec.tradeoff, 'plan-detail');

    li.appendChild(top);
    li.appendChild(actionEl);
    li.appendChild(whyEl);
    li.appendChild(details);
    planFragment.appendChild(li);
  });
  els.planList.replaceChildren(planFragment);

  els.prioritySummary.textContent = planResult.prioritySummary;
  els.tradeoffSummary.textContent = planResult.tradeoffSummary;

  const signalsFragment = document.createDocumentFragment();
  planResult.signals.forEach((sig) => {
    appendDefinitionRow(signalsFragment, sig.label, sig.value, 'signal-item');
  });
  els.signalsList.replaceChildren(signalsFragment);

  const alternativesFragment = document.createDocumentFragment();
  planResult.alternatives.forEach((alt) => {
    const card = document.createElement('article');
    card.className = 'alternative-card';

    const title = document.createElement('h3');
    title.textContent = alt.alternative;

    const dl = document.createElement('dl');
    dl.className = 'alternative-meta';
    appendDefinitionRow(dl, 'Exposure benefit', alt.exposureBenefit);
    appendDefinitionRow(dl, 'Emissions benefit', alt.emissionsBenefit);
    appendDefinitionRow(dl, 'Convenience or cost tradeoff', alt.tradeoff);

    card.appendChild(title);
    card.appendChild(dl);
    alternativesFragment.appendChild(card);
  });
  els.alternativesGrid.replaceChildren(alternativesFragment);
}

/**
 * Renders an assistant response into the output element.
 *
 * @param {import('./assistant.js').AssistantResponse} result    - Assistant result
 * @param {Element}                                     outputEl  - Target output element
 * @returns {void}
 */
export function renderAssistantResponse(result, outputEl) {
  const fragment = document.createDocumentFragment();

  const echo = document.createElement('p');
  echo.className = 'assistant-question-echo';
  echo.textContent = `Question: "${result.question}"`;
  fragment.appendChild(echo);

  const dl = document.createElement('dl');
  dl.className = 'assistant-response-grid';
  appendDefinitionRow(dl, 'Direct answer', result.directAnswer, 'assistant-block');
  appendDefinitionRow(dl, 'Reasoning from your context', result.reasoning, 'assistant-block');
  appendDefinitionRow(dl, 'Practical next step', result.nextStep, 'assistant-block');
  fragment.appendChild(dl);

  if (result.safetyCaveat) {
    const caveat = document.createElement('p');
    caveat.className = 'assistant-caveat';
    caveat.textContent = result.safetyCaveat;
    fragment.appendChild(caveat);
  }

  outputEl.replaceChildren(fragment);
}
