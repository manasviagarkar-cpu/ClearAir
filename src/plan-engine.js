/**
 * @fileoverview Plan generation engine for ClearAir.
 *
 * generatePlan() collects Candidates from focused rule functions, sorts by
 * score descending (then id ascending for determinism), slices to 4–6, and
 * returns a PlanResult.  All inline arithmetic uses RULE_SCORES so the
 * intent of every number is documented in one place.
 */

import { validateHousehold, normalizeAirQuality } from './validation.js';

// ---------------------------------------------------------------------------
// RULE_SCORES — named constants for every base score and boost used below.
// Higher numbers surface a recommendation earlier in the ranked list.
// Boosts are additive and may stack; the final sort is deterministic.
// ---------------------------------------------------------------------------
export const RULE_SCORES = {
  // Base scores (category ceilings before any boost)
  OUTDOOR_CHILD_SEVERE: 112,     // Highest priority: children + severe smog
  OUTDOOR_TIMING_SHIFT: 94,      // Timing shift for severe/poor + vulnerable
  OUTDOOR_MODERATE_WINDOW: 74,   // Milder outdoor guidance on moderate days

  COMMUTE_OUTDOOR_SHIFT: 92,     // Reroute open outdoor commute during smog
  COMMUTE_WFH_CONSOLIDATE: 84,   // WFH errand batching
  COMMUTE_REMOTE_WORK: 84,       // Remote-work/study suggestion (non-WFH)
  COMMUTE_CAR_GUIDANCE: 82,      // Private-car cabin advice
  COMMUTE_TRANSIT: 80,           // Public-transit reinforcement
  COMMUTE_ACTIVE_MODERATE: 76,   // Active commute on moderate day
  COMMUTE_ERRAND_CONSOL: 75,     // Errand consolidation (non-WFH)

  INDOOR_WINDOWS_TIMING: 92,     // Window-close timing during smog
  INDOOR_CHECK_SEALS: 84,        // Uncertain sealing — check drafts
  INDOOR_SEAL_GAPS: 83,          // No closeable windows — seal gaps

  BEDROOM_PURIFIER: 88,          // Run existing purifier in bedroom
  CLEANER_ROOM_NO_COST: 86,      // No purifier — designate cleaner room

  INDOOR_COMBUSTION: 81,         // Gas cooking / incense / candle control
  MECH_VENT_FILTER: 90,          // Mechanical-ventilation filter check

  // Priority boosts (added when user priority matches)
  BOOST_EXPOSURE_HIGH: 22,       // 'Lowest exposure' — strong boost
  BOOST_EXPOSURE_BALANCED: 4,    // 'Balanced option' — small exposure boost
  BOOST_EMISSIONS_HIGH: 28,      // 'Lowest emissions' — strong boost
  BOOST_EMISSIONS_BALANCED: 4,   // 'Balanced option' — small emissions boost
  BOOST_COST: 20,                // 'Lowest cost' — base cost boost amount

  // Situational boosts (stacked on top of base + priority boost)
  BOOST_SEVERE: 8,               // Air quality is Severe
  BOOST_VULNERABLE: 12,          // Household includes a vulnerable member
  BOOST_CHILD_SEVERE_COST: 8,    // Child + severe + cost priority
  BOOST_TIMING_COST: 10,         // Timing shift + cost priority
  BOOST_OUTDOOR_MOD_VULN: 10,    // Moderate outdoor + vulnerable
  BOOST_OUTDOOR_MOD_COST: 10,    // Moderate outdoor + cost priority
  BOOST_WFH_COST: 12,            // WFH consolidation + cost priority
  BOOST_COMMUTE_OUTDOOR_EMISSIONS: 26, // Outdoor commute + emissions priority
  BOOST_COMMUTE_OUTDOOR_EXPOSURE: 16,  // Outdoor commute + exposure priority
  BOOST_CAR_EMISSIONS: 0,        // (resolved inline from emissionsBoost)
  BOOST_CAR_SEVERE: 8,           // Car + severe
  BOOST_CAR_LARGE_EMISSIONS: 6,  // Large household + car + emissions priority
  BOOST_REMOTE_WORK_SEVERE: 8,   // Remote work suggestion + severe
  BOOST_REMOTE_WORK_EXPOSURE: 20,// Remote work + exposure priority
  BOOST_REMOTE_WORK_EMISSIONS: 12,// Remote work + emissions priority
  BOOST_INDOOR_WINDOWS_EXPOSURE: 14, // Windows timing + exposure priority
  BOOST_INDOOR_WINDOWS_SEVERE: 8,   // Windows timing + severe
  BOOST_INDOOR_CHECK_EXPOSURE: 10,  // Indoor-seal check + exposure priority
  BOOST_INDOOR_SEAL_EXPOSURE: 10,   // Indoor seal-gaps + exposure priority
  BOOST_PURIFIER_VULNERABLE: 10,    // Purifier + vulnerable member
  BOOST_PURIFIER_EXPOSURE: 18,      // Purifier + exposure priority
  BOOST_PURIFIER_COST_PENALTY: -4,  // Purifier + cost priority (de-prioritize high energy)
  BOOST_CLEANER_ROOM_SEVERE: 6,     // Cleaner room + severe
  BOOST_COMBUSTION_GAS: 15,         // Gas cooking present
  BOOST_COMBUSTION_COST: 0,         // (resolved inline via costBoost)
  BOOST_COMBUSTION_RESPIRATORY: 10, // Respiratory sensitivity
  BOOST_COMBUSTION_LARGE_GAS: 6,    // Large household + gas cooking
  BOOST_MECH_VENT_SEVERE: 6,        // Mech vent + severe
  BOOST_MECH_VENT_EXPOSURE: 12,     // Mech vent + exposure priority
  BOOST_MECH_VENT_COST_PENALTY: -4, // Mech vent + cost priority
  BOOST_ERRAND_LARGE: 4,            // Errand consolidation + non-small household
  BOOST_ERRAND_COST: 10,            // Errand consolidation + cost priority
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Candidate
 * @property {string} id           - Unique recommendation ID
 * @property {number} score        - Numeric ranking score (stripped before returning)
 * @property {string} label        - Short section label (e.g. 'Outdoor play & exercise')
 * @property {string} action       - Main imperative advice sentence
 * @property {string} whyItMatters - Why this action is important for the household
 * @property {string} directImpact - Hedged direct-impact statement
 * @property {string} tradeoff     - Honest tradeoff or cost note
 * @property {string} confidence   - Hedged confidence phrase
 */

/**
 * @typedef {Object} PlanResult
 * @property {Omit<Candidate,'score'>[]} recommendations - Ordered top recommendations
 * @property {import('./locations.js').AirQuality}       airQuality      - Normalized AQ used
 * @property {import('./validation.js').Household}       household       - Normalized household
 * @property {Array<{label:string,value:string}>}        signals         - Transparency signals
 * @property {string}                                    prioritySummary - Why-this-plan text
 * @property {string}                                    tradeoffSummary - Key tradeoff note
 * @property {string}                                    safetyCaveat    - Safety banner text
 * @property {object[]}                                  alternatives    - Sustainable alternatives
 */

/**
 * @typedef {Object} AnalysisContext
 * @property {boolean} hasChild
 * @property {boolean} hasOlderAdult
 * @property {boolean} hasRespiratory
 * @property {boolean} hasHeart
 * @property {boolean} hasVulnerable
 * @property {boolean} hasPurifier
 * @property {boolean} windowsCanClose
 * @property {boolean} hasMechVent
 * @property {boolean} cookingWithGas
 * @property {boolean} indoorNotSure
 * @property {boolean} isSevere
 * @property {boolean} isPoor
 * @property {boolean} isModerate
 * @property {boolean} isOutdoorCommute
 * @property {boolean} isCar
 * @property {boolean} isTransit
 * @property {boolean} isWfh
 * @property {boolean} canShiftSchedule
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * @param {import('./validation.js').Household} household
 * @param {import('./locations.js').AirQuality}  airQuality
 * @returns {AnalysisContext}
 */
function analyzeContext(household, airQuality) {
  const { sensitivities, indoor, travelMode, outdoorTime } = household;

  const hasChild = sensitivities.includes('Child under 12');
  const hasOlderAdult = sensitivities.includes('Older adult');
  const hasRespiratory = sensitivities.includes('Asthma or respiratory sensitivity');
  const hasHeart = sensitivities.includes('Heart or cardiovascular sensitivity');
  const hasVulnerable = hasChild || hasOlderAdult || hasRespiratory || hasHeart;

  const hasPurifier = indoor.includes('Air purifier available');
  const windowsCanClose = indoor.includes('Windows can be closed');
  const hasMechVent = indoor.includes('Mechanical ventilation available');
  const cookingWithGas = indoor.includes('Cooking with gas');
  const indoorNotSure = indoor.includes('Not sure');

  const isSevere = airQuality.severity === 'Severe' || airQuality.pm25 >= 120;
  const isPoor = !isSevere && (airQuality.severity === 'Poor' || airQuality.pm25 >= 45);
  const isModerate = !isSevere && !isPoor;

  const isOutdoorCommute = ['Walk', 'Cycle', 'Two-wheeler'].includes(travelMode);
  const isCar = travelMode === 'Private car';
  const isTransit = travelMode === 'Public transit';
  const isWfh = travelMode === 'Work from home';
  const canShiftSchedule = outdoorTime === 'Flexible';

  return {
    hasChild, hasOlderAdult, hasRespiratory, hasHeart, hasVulnerable,
    hasPurifier, windowsCanClose, hasMechVent, cookingWithGas, indoorNotSure,
    isSevere, isPoor, isModerate,
    isOutdoorCommute, isCar, isTransit, isWfh, canShiftSchedule,
  };
}

/**
 * Returns a human-readable sensitivity phrase for use in plan text.
 *
 * @param {string[]} sensitivities
 * @returns {string}
 */
function formatSensitivityPhrase(sensitivities) {
  const map = {
    'Child under 12': 'a child under 12',
    'Older adult': 'an older adult',
    'Asthma or respiratory sensitivity': 'someone with asthma or respiratory sensitivity',
    'Heart or cardiovascular sensitivity': 'someone with heart or cardiovascular sensitivity',
  };
  const active = sensitivities
    .filter((s) => s !== 'None of these')
    .map((s) => map[s] || s.toLowerCase());
  if (active.length === 0) return 'sensitive household members';
  if (active.length === 1) return active[0];
  return `${active.slice(0, -1).join(', ')} and ${active[active.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Rule functions — each returns zero or more Candidates
// ---------------------------------------------------------------------------

/**
 * Rule 1: Outdoor activity, timing, and vulnerable household protection.
 *
 * @param {import('./validation.js').Household} household
 * @param {import('./locations.js').AirQuality}  aq
 * @param {AnalysisContext}                       ctx
 * @param {string}                                sensitivityPhrase
 * @param {number}                                exposureBoost
 * @param {string}                                priority
 * @returns {Candidate[]}
 */
function outdoorActivityCandidates(household, aq, ctx, sensitivityPhrase, exposureBoost, priority) {
  const isCostPriority = priority === 'Lowest cost';

  if (ctx.isSevere && ctx.hasChild) {
    return [{
      id: 'outdoor-child-severe',
      score: RULE_SCORES.OUTDOOR_CHILD_SEVERE + exposureBoost + (isCostPriority ? RULE_SCORES.BOOST_CHILD_SEVERE_COST : 0),
      label: 'Outdoor play & exercise · Skip peak hours',
      action:
        'Keep children indoors for active play today and replace outdoor sports with calm indoor movement.',
      whyItMatters: `${aq.city} has severe fine-particle pollution (${aq.pm25} µg/m³ PM2.5) with ${aq.wind.toLowerCase()} air, and children breathe faster per body weight.`,
      directImpact: 'May reduce peak PM2.5 exposure during stagnant smog hours.',
      tradeoff: 'Requires organizing indoor games or quiet time at home instead of park play.',
      confidence: 'Usually helps lower total daily particle intake.',
    }];
  }

  if (ctx.isSevere || (ctx.isPoor && ctx.hasVulnerable)) {
    let timingAction = '';
    if (ctx.canShiftSchedule) {
      timingAction = `Because your schedule is flexible, move essential outdoor tasks to ${aq.cleanerWindow} and keep exertion light.`;
    } else if (household.outdoorTime === 'Early morning') {
      timingAction =
        'Early morning traps winter smog near street level; pause outdoor workouts today or shift brief errands to midday when air mixes better.';
    } else if (household.outdoorTime === 'Evening') {
      timingAction =
        'Evening cooling traps rush-hour exhaust close to the ground; move outdoor activity indoors or finish errands before late afternoon.';
    } else {
      timingAction = `Even at midday, ${aq.city} is ${aq.severity.toLowerCase()}; keep outdoor time brief, avoid main roads, and skip heavy exertion.`;
    }

    const vulnNote =
      ctx.hasRespiratory || ctx.hasHeart
        ? ' Cold polluted air can irritate sensitive airways and cardiovascular systems more quickly.'
        : ctx.hasOlderAdult
          ? ' Older adults face higher risk from fine-particle buildup during stagnant hours.'
          : '';

    return [{
      id: 'outdoor-timing-shift',
      score:
        RULE_SCORES.OUTDOOR_TIMING_SHIFT
        + exposureBoost
        + (ctx.hasVulnerable ? RULE_SCORES.BOOST_VULNERABLE : 0)
        + (isCostPriority ? RULE_SCORES.BOOST_TIMING_COST : 0),
      label: `Outdoor timing · ${household.outdoorTime}`,
      action: timingAction,
      whyItMatters: `With PM2.5 at ${aq.pm25} µg/m³ (${aq.severity}) and ${aq.wind.toLowerCase()} conditions, ${household.outdoorTime.toLowerCase()} routines carry higher particle exposure.${vulnNote}`,
      directImpact: 'May reduce peak PM2.5 exposure compared with exercising in stagnant traffic periods.',
      tradeoff: 'Shifting timing can conflict with school or work schedules and may shorten workouts.',
      confidence: 'A lower-exposure option when practical.',
    }];
  }

  // Moderate conditions
  let modAction = '';
  if (ctx.canShiftSchedule) {
    modAction = `Schedule walks or exercise during ${aq.cleanerWindow} along tree-lined or residential streets.`;
  } else if (household.outdoorTime === 'Midday') {
    modAction =
      'Your midday outdoor window already avoids rush-hour peaks; stick to parks or side streets away from arterial traffic.';
  } else {
    modAction = `During your ${household.outdoorTime.toLowerCase()} routine, choose residential side streets at least a block away from bus and truck lanes.`;
  }

  return [{
    id: 'outdoor-moderate-window',
    score:
      RULE_SCORES.OUTDOOR_MODERATE_WINDOW
      + (isCostPriority ? RULE_SCORES.BOOST_OUTDOOR_MOD_COST : 0)
      + (ctx.hasVulnerable ? RULE_SCORES.BOOST_OUTDOOR_MOD_VULN : 0),
    label: `Outdoor activity · ${household.outdoorTime}`,
    action: modAction,
    whyItMatters: `Even on ${aq.severity.toLowerCase()} days (${aq.pm25} µg/m³ PM2.5), particle levels spike close to idling cars and buses${
      ctx.hasVulnerable ? ', which matters more for sensitive household members' : ''
    }.`,
    directImpact: 'May reduce roadside fine-particle exposure without giving up daily movement.',
    tradeoff: 'Quieter detour routes can add 5–10 minutes to a walk or run.',
    confidence: 'Usually helps reduce traffic-corridor exposure.',
  }];
}

/**
 * Rule 2: Travel, commute and remote-work guidance.
 *
 * @param {import('./validation.js').Household} household
 * @param {import('./locations.js').AirQuality}  aq
 * @param {AnalysisContext}                       ctx
 * @param {number}                                emissionsBoost
 * @param {string}                                priority
 * @param {boolean}                               isLargeHousehold
 * @param {boolean}                               isSmallHousehold
 * @returns {Candidate[]}
 */
function commuteCandidates(household, aq, ctx, emissionsBoost, priority, isLargeHousehold, isSmallHousehold) {
  const isCostPriority = priority === 'Lowest cost';
  const prefersEmissions = priority === 'Lowest emissions';
  const results = /** @type {Candidate[]} */ ([]);

  if (ctx.isWfh) {
    results.push({
      id: 'wfh-consolidate',
      score:
        RULE_SCORES.COMMUTE_WFH_CONSOLIDATE
        + emissionsBoost
        + (isCostPriority ? RULE_SCORES.BOOST_WFH_COST : 0),
      label: 'Daily errands · Work-from-home day',
      action: isLargeHousehold
        ? `Keep ${household.householdSize} off peak roads by batching groceries, school pick-ups, and errands into one midday loop.`
        : 'Stay off peak roads by batching groceries or pharmacy errands into a single midday trip or consolidated delivery.',
      whyItMatters: `Working from home already eliminates commute emissions; batching errands keeps your household out of ${aq.peakSmogWindows} traffic.`,
      directImpact: 'Reduces unnecessary vehicle emissions and avoids peak roadside PM2.5.',
      tradeoff: 'Requires planning errands ahead rather than making quick separate trips.',
      confidence: 'Usually helps keep both emissions and exposure lower.',
    });
  } else if (ctx.isOutdoorCommute && (ctx.isSevere || ctx.isPoor)) {
    let commuteAction = '';
    if (prefersEmissions) {
      commuteAction = `When practical, switch today's ${household.travelMode.toLowerCase()} commute to enclosed public transit or shared travel, or shift timing outside rush hours.`;
    } else if (isCostPriority) {
      commuteAction = `If switching from ${household.travelMode.toLowerCase()} to transit is not in the budget today, leave outside ${aq.peakSmogWindows} and take quieter side streets away from heavy buses.`;
    } else {
      commuteAction = `Consider enclosed public transit or a shared ride instead of an open ${household.travelMode.toLowerCase()} commute during ${aq.city}'s ${aq.severity.toLowerCase()} smog.`;
    }

    results.push({
      id: 'commute-outdoor-shift',
      score:
        RULE_SCORES.COMMUTE_OUTDOOR_SHIFT
        + (prefersEmissions ? RULE_SCORES.BOOST_COMMUTE_OUTDOOR_EMISSIONS : 0)
        + (priority === 'Lowest exposure' ? RULE_SCORES.BOOST_COMMUTE_OUTDOOR_EXPOSURE : 0)
        + (ctx.isSevere ? RULE_SCORES.BOOST_SEVERE : 0),
      label: `Daily travel · ${household.travelMode}`,
      action: commuteAction,
      whyItMatters: `Open ${household.travelMode.toLowerCase()} commutes expose travelers directly to tailpipe exhaust while ${aq.city} sits at ${aq.aqi} AQI (${aq.severity}).`,
      directImpact:
        'May reduce direct roadside PM2.5 inhalation while keeping per-person transport emissions low.',
      tradeoff: isCostPriority
        ? 'Side-street timing adds travel minutes, while transit trades zero fare for lower smog inhalation.'
        : 'Public transit or shared rides can take longer door-to-door and add modest fare cost compared with walking or cycling.',
      confidence: 'A lower-exposure and lower-emission option when practical.',
    });
  } else if (ctx.isCar) {
    results.push({
      id: 'commute-car-guidance',
      score:
        RULE_SCORES.COMMUTE_CAR_GUIDANCE
        + emissionsBoost
        + (ctx.isSevere ? RULE_SCORES.BOOST_CAR_SEVERE : 0)
        + (isLargeHousehold && prefersEmissions ? RULE_SCORES.BOOST_CAR_LARGE_EMISSIONS : 0),
      label: 'Daily travel · Private car',
      action: prefersEmissions
        ? isLargeHousehold
          ? 'Shift solo trips to public transit, combine school/work drop-offs into one shared carpool, and switch off your engine whenever parked over 30 seconds.'
          : 'Use public transit, carpool, or combine trips to cut solo car miles, and shut off your engine whenever parked over 30 seconds.'
        : 'Set cabin ventilation to recirculate in heavy traffic, avoid engine idling, and replace solo errands with shared or public transit when practical.',
      whyItMatters:
        'Cold winter engines and idling in congestion add fine particles and nitrogen oxides directly into neighborhood air.',
      directImpact:
        'Reduces unnecessary vehicle emissions and helps limit polluted roadside air entering the cabin.',
      tradeoff:
        'Recirculation can feel stuffy on long drives (briefly refresh air on open roads), and transit or carpooling takes more coordination.',
      confidence: 'Usually helps lower both local exhaust and cabin buildup.',
    });
  } else if (ctx.isTransit) {
    results.push({
      id: 'commute-transit-guidance',
      score: RULE_SCORES.COMMUTE_TRANSIT + emissionsBoost,
      label: 'Daily travel · Public transit',
      action:
        ctx.isSevere || ctx.isPoor
          ? 'Keep using public transit, wait a few steps back from bus tailpipes at stops, and choose enclosed rail/metro over open roadside waiting when available.'
          : 'Keep using public transit for main trips, and stand clear of idling curb exhaust lanes while waiting.',
      whyItMatters:
        'Public transit moves more people with lower per-person emissions than private cars or two-wheelers.',
      directImpact: 'Reduces per-person transport emissions and avoids heavy exertion in street smog.',
      tradeoff: 'Station platforms and crowded buses may still have elevated particle levels at rush hour.',
      confidence: 'A practical low-emission option for urban commutes.',
    });
  } else {
    // Moderate outdoor commute (Walk, Cycle, Two-wheeler on moderate day)
    results.push({
      id: 'commute-active-moderate',
      score:
        RULE_SCORES.COMMUTE_ACTIVE_MODERATE
        + emissionsBoost
        + (isCostPriority ? RULE_SCORES.BOOST_ERRAND_COST - 2 : 0),
      label: `Daily travel · ${household.travelMode}`,
      action:
        'Continue low-emission travel along quieter back streets, and keep a steady pace rather than riding right behind diesel buses or trucks.',
      whyItMatters:
        'Heavy breathing directly behind tailpipes pulls concentrated exhaust deeper into airways even on moderate days.',
      directImpact: 'Keeps daily travel low-emission while moderating roadside particle intake.',
      tradeoff: 'Side-street detours or a gentler pace can add 5–10 minutes to commute time.',
      confidence: 'Usually helps balance low emissions with lower exposure.',
    });
  }

  // Optional remote work / study suggestion when severe + non-WFH + non-cost priority
  if (!ctx.isWfh && (ctx.isSevere || (ctx.isPoor && ctx.hasVulnerable)) && !isCostPriority) {
    results.push({
      id: 'remote-work-study',
      score:
        RULE_SCORES.COMMUTE_REMOTE_WORK
        + (ctx.isSevere ? RULE_SCORES.BOOST_REMOTE_WORK_SEVERE : 0)
        + (priority === 'Lowest exposure' ? RULE_SCORES.BOOST_REMOTE_WORK_EXPOSURE : 0)
        + (prefersEmissions ? RULE_SCORES.BOOST_REMOTE_WORK_EMISSIONS : 0),
      label: 'Schedule flexibility · Remote work or study',
      action:
        'When your workplace or school allows, work or study remotely today to skip peak-smog commuting altogether.',
      whyItMatters: `Skipping one commute day in ${aq.city} (${aq.aqi} AQI) eliminates both roadside exposure and daily commute emissions.`,
      directImpact: 'May substantially reduce daily peak PM2.5 inhalation and avoids commute emissions.',
      tradeoff: 'Not realistic for in-person roles, school labs, or households without remote options.',
      confidence: 'A high-impact lower-exposure option when practical.',
    });
  }

  // Errand consolidation for non-WFH households
  if (!ctx.isWfh) {
    results.push({
      id: 'errand-consolidation',
      score:
        RULE_SCORES.COMMUTE_ERRAND_CONSOL
        + emissionsBoost
        + (isCostPriority ? RULE_SCORES.BOOST_ERRAND_COST : 0)
        + (isSmallHousehold ? 0 : RULE_SCORES.BOOST_ERRAND_LARGE),
      label: 'Afternoon · Errands & cold starts',
      action:
        'Consolidate shopping, pharmacy, and pick-up errands into one planned trip rather than multiple short cold-start drives.',
      whyItMatters:
        'Short cold-start engine trips produce disproportionately high tailpipe emissions and put people near curb traffic repeatedly.',
      directImpact: 'Reduces unnecessary vehicle emissions and cuts total time spent near traffic.',
      tradeoff: 'Takes a bit of advance list-making so small items wait for one combined run.',
      confidence: 'Usually helps reduce both fuel use and neighborhood emissions.',
    });
  }

  return results;
}

/**
 * Rule 3: Indoor air and window strategy.
 *
 * @param {import('./locations.js').AirQuality} aq
 * @param {AnalysisContext}                      ctx
 * @param {number}                               costBoost
 * @param {string}                               priority
 * @returns {Candidate[]}
 */
function indoorWindowCandidates(aq, ctx, costBoost, priority) {
  if (ctx.windowsCanClose) {
    return [{
      id: 'indoor-windows-timing',
      score:
        RULE_SCORES.INDOOR_WINDOWS_TIMING
        + costBoost
        + (priority === 'Lowest exposure' ? RULE_SCORES.BOOST_INDOOR_WINDOWS_EXPOSURE : 0)
        + (ctx.isSevere ? RULE_SCORES.BOOST_INDOOR_WINDOWS_SEVERE : 0),
      label: 'Indoor air · Window timing',
      action: ctx.isModerate
        ? `Keep street-facing windows shut during ${aq.peakSmogWindows}, and air out rooms for 15–20 minutes during ${aq.cleanerWindow}.`
        : `Keep windows and exterior doors closed during ${aq.peakSmogWindows}, and air out rooms briefly for 10–15 minutes only if midday air looks clearer.`,
      whyItMatters: `At ${aq.pm25} µg/m³ PM2.5 outdoors, leaving windows open during calm hours lets fine soot drift steadily indoors.`,
      directImpact:
        'Helps prevent polluted outdoor air from entering the room during the worst period.',
      tradeoff:
        'Indoor air can feel warm or stale when sealed, so brief cross-ventilation during cleaner midday hours is helpful.',
      confidence: 'Usually helps reduce indoor particle spikes at zero cost.',
    }];
  }

  if (ctx.indoorNotSure) {
    return [{
      id: 'indoor-check-seals',
      score:
        RULE_SCORES.INDOOR_CHECK_SEALS
        + costBoost
        + (priority === 'Lowest exposure' ? RULE_SCORES.BOOST_INDOOR_CHECK_EXPOSURE : 0),
      label: 'Indoor air · Check seals & airflow',
      action:
        'Check which room closes most tightly against outdoor drafts and use rolled towels along loose sills during peak smog hours.',
      whyItMatters:
        'When indoor sealing is uncertain, identifying one tighter interior room helps keep winter soot out during calm inversions.',
      directImpact: 'May reduce outdoor fine particles drifting into your main living space without cost.',
      tradeoff: 'Requires quick room checks and simple draft blocking rather than automated filtration.',
      confidence: 'Consider when practical as a zero-cost first step.',
    }];
  }

  return [{
    id: 'indoor-seal-gaps',
    score:
      RULE_SCORES.INDOOR_SEAL_GAPS
      + costBoost
      + (priority === 'Lowest exposure' ? RULE_SCORES.BOOST_INDOOR_SEAL_EXPOSURE : 0),
    label: 'Indoor air · Draft & zone control',
    action:
      'Use rolled towels or temporary weatherstripping on leaky window gaps in the room where your household spends the most time.',
    whyItMatters:
      'When windows do not seal tightly, winter smog seeps in continuously during calm inversions.',
    directImpact: 'May reduce outdoor fine particles drifting into your main living space.',
    tradeoff: 'Requires simple household setup and does not replace mechanical filtration.',
    confidence: 'Consider when practical as a low-cost barrier.',
  }];
}

/**
 * Rule 4: Cleaner-air bedroom and purifier / sleep guidance.
 *
 * @param {import('./validation.js').Household} household
 * @param {AnalysisContext}                      ctx
 * @param {string}                               sensitivityPhrase
 * @param {number}                               costBoost
 * @param {string}                               priority
 * @param {boolean}                              isLargeHousehold
 * @returns {Candidate[]}
 */
function bedroomAirCandidates(household, ctx, sensitivityPhrase, costBoost, priority, isLargeHousehold) {
  const isCostPriority = priority === 'Lowest cost';

  if (ctx.hasPurifier) {
    const targetRoom = ctx.hasVulnerable
      ? `the closed bedroom used by ${sensitivityPhrase}`
      : 'your main closed bedroom';
    return [{
      id: 'bedroom-purifier',
      score:
        RULE_SCORES.BEDROOM_PURIFIER
        + (ctx.hasVulnerable ? RULE_SCORES.BOOST_PURIFIER_VULNERABLE : 0)
        + (priority === 'Lowest exposure' ? RULE_SCORES.BOOST_PURIFIER_EXPOSURE : 0)
        + (isCostPriority ? RULE_SCORES.BOOST_PURIFIER_COST_PENALTY : 0),
      label: 'Evening & sleep · Bedroom air',
      action: isCostPriority
        ? `Close the door to ${targetRoom} and run your existing purifier on a low, energy-saving steady speed overnight rather than full blast all day.`
        : `Close the door to ${targetRoom} and run your HEPA air purifier on medium-high 45 minutes before bedtime, then keep it on a quiet steady speed overnight.`,
      whyItMatters:
        'Households spend 7–9 hours asleep; lowering particles in one closed bedroom gives lungs a long recovery break.',
      directImpact: 'May improve bedroom air quality before sleep.',
      tradeoff: 'Uses modest electricity and gentle fan noise overnight.',
      confidence: 'Usually helps lower indoor PM2.5 in closed rooms.',
    }];
  }

  return [{
    id: 'cleaner-room-no-cost',
    score:
      RULE_SCORES.CLEANER_ROOM_NO_COST
      + (ctx.hasVulnerable ? RULE_SCORES.BOOST_VULNERABLE : 0)
      + costBoost
      + (ctx.isSevere ? RULE_SCORES.BOOST_CLEANER_ROOM_SEVERE : 0),
    label: 'Indoor sanctuary · Cleaner-air room',
    action: isLargeHousehold
      ? 'Designate one quiet interior bedroom for sensitive family members or sleepers: keep its door and windows shut during peak smog, damp-dust surfaces, and keep cooking smoke out.'
      : 'Designate one quiet interior bedroom as a cleaner-air room: keep its door and windows shut during peak smog, damp-dust surfaces, and skip indoor smoke sources.',
    whyItMatters:
      'Even without an air purifier, keeping one low-traffic room closed and free of indoor smoke keeps particle buildup noticeably lower—without buying new gear.',
    directImpact:
      'May reduce overnight exposure for sensitive family members using zero-cost habits.',
    tradeoff:
      'Requires coordinating household routines in one shared room and periodic damp cleaning.',
    confidence: 'A practical, zero-cost way that may reduce indoor exposure.',
  }];
}

/**
 * Rule 5: Indoor particle sources — gas cooking, incense, candles.
 *
 * @param {AnalysisContext} ctx
 * @param {number}          costBoost
 * @param {boolean}         isLargeHousehold
 * @returns {Candidate[]}
 */
function indoorCombustionCandidates(ctx, costBoost, isLargeHousehold) {
  return [{
    id: 'indoor-combustion-control',
    score:
      RULE_SCORES.INDOOR_COMBUSTION
      + (ctx.cookingWithGas ? RULE_SCORES.BOOST_COMBUSTION_GAS : 0)
      + costBoost
      + (ctx.hasRespiratory ? RULE_SCORES.BOOST_COMBUSTION_RESPIRATORY : 0)
      + (isLargeHousehold && ctx.cookingWithGas ? RULE_SCORES.BOOST_COMBUSTION_LARGE_GAS : 0),
    label: 'Home routines · Indoor sources',
    action: ctx.cookingWithGas
      ? 'Use the kitchen exhaust fan (or crack a kitchen window briefly with the kitchen door shut while cooking), cover pots with lids, and avoid incense or candles.'
      : 'Avoid burning incense, candles, mosquito coils, or indoor smoke today, and damp-mop dust instead of dry sweeping.',
    whyItMatters: ctx.cookingWithGas
      ? 'Gas burners and frying release extra fine particles and nitrogen dioxide that linger longer when windows stay closed for smog.'
      : 'When outdoor smog keeps windows shut, even small indoor combustion sources build up quickly inside the home.',
    directImpact: 'Reduces avoidable indoor fine-particle and gas spikes.',
    tradeoff: 'Skip traditional scented candles or incense and take an extra minute to vent cooking steam.',
    confidence: 'Usually helps keep indoor air cleaner without extra cost.',
  }];
}

/**
 * Rule 6: Mechanical ventilation filter guidance.
 *
 * @param {import('./locations.js').AirQuality} aq
 * @param {AnalysisContext}                      ctx
 * @param {string}                               priority
 * @returns {Candidate[]}
 */
function mechVentCandidates(aq, ctx, priority) {
  if (!ctx.hasMechVent) return [];
  const isCostPriority = priority === 'Lowest cost';
  return [{
    id: 'mech-vent-filter',
    score:
      RULE_SCORES.MECH_VENT_FILTER
      + (ctx.isSevere ? RULE_SCORES.BOOST_MECH_VENT_SEVERE : 0)
      + (priority === 'Lowest exposure' ? RULE_SCORES.BOOST_MECH_VENT_EXPOSURE : 0)
      + (isCostPriority ? RULE_SCORES.BOOST_MECH_VENT_COST_PENALTY : 0),
    label: 'Building airflow · Mechanical ventilation',
    action: isCostPriority
      ? 'Check if your building\'s mechanical ventilation already uses clean filters before opening windows, and pause unfiltered outdoor intake during peak smog.'
      : 'Confirm your mechanical ventilation uses clean pleated filters (such as MERV-13 if supported) and avoid pulling unfiltered outdoor air during peak smog hours.',
    whyItMatters:
      'Unfiltered mechanical intake can pull outdoor PM2.5 indoors, whereas well-filtered systems supply fresh air without opening windows.',
    directImpact: 'May reduce outdoor particle entry while maintaining fresh indoor airflow.',
    tradeoff: 'Filter checks or upgrades depend on building access and system compatibility.',
    confidence: 'Consider when practical depending on building controls.',
  }];
}

// ---------------------------------------------------------------------------
// Summary builders
// ---------------------------------------------------------------------------

/**
 * @param {string} priority
 * @param {import('./locations.js').AirQuality}  aq
 * @param {AnalysisContext}                       ctx
 * @param {string}                                sensitivityPhrase
 * @param {import('./validation.js').Household}  household
 * @returns {string}
 */
function buildPrioritySummary(priority, aq, ctx, sensitivityPhrase, household) {
  if (priority === 'Lowest exposure') {
    return `We prioritized exposure reduction because ${aq.city} is at ${aq.severity.toLowerCase()} PM2.5 (${aq.pm25} µg/m³)${
      ctx.hasVulnerable
        ? ` and your ${household.householdSize} household includes ${sensitivityPhrase}`
        : ''
    }.`;
  }
  if (priority === 'Lowest emissions') {
    return `We prioritized low-emission habits—transit, shared or batched trips, and zero-idling routines—adapted to ${aq.city}'s ${aq.severity.toLowerCase()} (${aq.pm25} µg/m³ PM2.5) conditions and your ${household.travelMode.toLowerCase()} routine.`;
  }
  if (priority === 'Lowest cost') {
    return 'We prioritized free, immediate adjustments—window timing, schedule shifts, and avoiding indoor smoke—before suggesting any purchases.';
  }
  return `We balanced exposure reduction and lower emissions because ${aq.city} is at ${aq.severity.toLowerCase()} PM2.5 (${aq.pm25} µg/m³)${
    ctx.hasVulnerable ? ` and your household includes ${sensitivityPhrase}` : ''
  }.`;
}

/**
 * @param {string} priority
 * @returns {string}
 */
function buildTradeoffSummary(priority) {
  if (priority === 'Lowest emissions') {
    return 'The lowest-emission option—such as walking or cycling beside heavy traffic—may not always be the lowest-exposure option during winter smog, so enclosed transit or quieter side-street timing is recommended.';
  }
  if (priority === 'Lowest cost') {
    return 'Free behavioral steps avoid equipment costs, though keeping windows shut during peak hours can feel warm or stale without brief midday airing.';
  }
  if (priority === 'Lowest exposure') {
    return 'Minimizing particle intake may require skipping outdoor exercise, shifting errands to midday, or choosing enclosed transit over open cycling or two-wheelers.';
  }
  return 'The lowest-exposure option may take more planning or indoor time, while the lowest-emission option may require public transit, shared travel, or consolidated errands.';
}

/**
 * @param {AnalysisContext}                       ctx
 * @param {import('./locations.js').AirQuality}  aq
 * @param {string}                                sensitivityPhrase
 * @returns {string}
 */
function buildSafetyCaveat(ctx, aq, sensitivityPhrase) {
  if (ctx.hasVulnerable && (ctx.isSevere || ctx.isPoor)) {
    return `Because your household includes ${sensitivityPhrase} during ${aq.severity.toLowerCase()} air quality (${aq.pm25} µg/m³ PM2.5), keep outdoor time brief, watch for coughing or shortness of breath, and follow your clinician's action plan if anyone has asthma or heart conditions.`;
  }
  if (ctx.hasVulnerable) {
    return `Even on moderate days, ${sensitivityPhrase} may experience irritation near heavy traffic. Keep any prescribed rescue medication handy.`;
  }
  if (ctx.isSevere) {
    return 'At severe PM2.5 levels, even healthy adults may experience throat irritation or fatigue from prolonged outdoor exertion.';
  }
  return '';
}

/**
 * @param {import('./validation.js').Household}  household
 * @param {import('./locations.js').AirQuality}  aq
 * @param {AnalysisContext}                       ctx
 * @returns {object[]}
 */
function buildSustainableAlternatives(household, aq, ctx) {
  return [
    {
      alternative: ctx.isWfh
        ? 'Batch deliveries and errands into one midday window'
        : 'Combine errands into one off-peak trip',
      exposureBenefit: 'Cuts repeated curb and intersection PM2.5 exposure during rush hours.',
      emissionsBenefit: 'Avoids extra cold-start engine trips that emit higher winter particulates.',
      tradeoff: 'Requires planning one list ahead instead of making quick spontaneous trips.',
    },
    {
      alternative: ctx.isCar || ctx.isOutdoorCommute
        ? 'Use public transit or shared travel on high-smog days'
        : 'Stay with shared transit or off-peak routing',
      exposureBenefit: ctx.isOutdoorCommute
        ? 'Enclosed metro or rail cabins may reduce direct roadside soot inhalation compared with open two-wheelers or cycling.'
        : 'Reduces time spent idling in congested bumper-to-bumper exhaust plumes.',
      emissionsBenefit: 'Lowers per-person tailpipe emissions across the city corridor.',
      tradeoff: 'May add transfer wait time or modest transit fare compared with solo travel.',
    },
    {
      alternative: ctx.isWfh
        ? 'Use electric appliances or pot lids to cut indoor cooking fumes'
        : 'Avoid unnecessary vehicle idling at pick-ups and gates',
      exposureBenefit: ctx.isWfh
        ? 'Reduces indoor fine-particle and NO2 spikes when windows stay shut.'
        : 'Prevents exhaust from pooling right outside schools, apartment gates, and sidewalks.',
      emissionsBenefit: ctx.isWfh
        ? 'Uses less fuel energy when heating water or food covered.'
        : 'Eliminates wasted fuel burn and stationary fine-particle emissions.',
      tradeoff: ctx.isWfh
        ? 'Takes minor kitchen routine adjustments and lid cleanup.'
        : 'Cabin heating or cooling pauses briefly while parked with the engine off.',
    },
    {
      alternative:
        household.priority === 'Lowest cost' || !ctx.hasPurifier
          ? 'Coordinate building or school cleaner-air window schedules'
          : `Shift outdoor exercise to ${aq.cleanerWindow}`,
      exposureBenefit:
        household.priority === 'Lowest cost' || !ctx.hasPurifier
          ? 'Helps keep shared indoor spaces closed during peak smog and aired out together at midday.'
          : 'May reduce peak PM2.5 exposure compared with stagnant morning or evening hours.',
      emissionsBenefit:
        household.priority === 'Lowest cost' || !ctx.hasPurifier
          ? 'Zero equipment or energy footprint compared with extra mechanical cooling.'
          : 'Encourages walking or active routines on neighborhood paths without extra driving.',
      tradeoff:
        household.priority === 'Lowest cost' || !ctx.hasPurifier
          ? 'Depends on neighbors or school staff agreeing on shared timing.'
          : 'Midday scheduling can conflict with work or school hours unless flexible.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a personalized daily air-quality action plan.
 *
 * Collects Candidates from each rule function, sorts by score descending
 * (then id ascending for determinism), slices to at most 6, and returns
 * a PlanResult.  generatePlan() contains no deep nested if/else; all
 * decision logic lives in the focused rule functions above.
 *
 * @param {{ household: unknown, airQuality: unknown }} [params]
 * @returns {PlanResult}
 */
export function generatePlan({ household, airQuality } = {}) {
  const { normalized: safeHousehold } = validateHousehold(household);
  const aq = normalizeAirQuality(airQuality, safeHousehold.city);
  const ctx = analyzeContext(safeHousehold, aq);
  const priority = safeHousehold.priority;
  const sensitivityPhrase = formatSensitivityPhrase(safeHousehold.sensitivities);
  const isLargeHousehold = safeHousehold.householdSize === '5+ people';
  const isSmallHousehold = safeHousehold.householdSize === '1–2 people';

  // Derived priority boosts — computed once and passed into rule functions
  const exposureBoost =
    priority === 'Lowest exposure'
      ? RULE_SCORES.BOOST_EXPOSURE_HIGH
      : priority === 'Balanced option'
        ? RULE_SCORES.BOOST_EXPOSURE_BALANCED
        : 0;
  const emissionsBoost =
    priority === 'Lowest emissions'
      ? RULE_SCORES.BOOST_EMISSIONS_HIGH
      : priority === 'Balanced option'
        ? RULE_SCORES.BOOST_EMISSIONS_BALANCED
        : 0;
  const costBoost = priority === 'Lowest cost' ? RULE_SCORES.BOOST_COST : 0;

  // Collect all candidates from rule functions
  const candidates = [
    ...outdoorActivityCandidates(safeHousehold, aq, ctx, sensitivityPhrase, exposureBoost, priority),
    ...commuteCandidates(safeHousehold, aq, ctx, emissionsBoost, priority, isLargeHousehold, isSmallHousehold),
    ...indoorWindowCandidates(aq, ctx, costBoost, priority),
    ...bedroomAirCandidates(safeHousehold, ctx, sensitivityPhrase, costBoost, priority, isLargeHousehold),
    ...indoorCombustionCandidates(ctx, costBoost, isLargeHousehold),
    ...mechVentCandidates(aq, ctx, priority),
  ];

  // Sort deterministically: score descending, then id ascending
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const recommendations = candidates.slice(0, 6).map(({ score: _score, ...rest }) => rest);

  const signals = [
    { label: 'Current pollution severity', value: `${aq.severity} (AQI ${aq.aqi})` },
    { label: 'PM2.5 condition', value: `${aq.pm25} µg/m³ · Wind: ${aq.wind}` },
    {
      label: 'Household sensitivities',
      value: `${safeHousehold.sensitivities.join(', ')} (${safeHousehold.householdSize})`,
    },
    { label: 'Main travel mode', value: `${safeHousehold.travelMode} · ${safeHousehold.outdoorTime}` },
    { label: 'Indoor environment', value: safeHousehold.indoor.join(', ') },
    { label: 'User priority', value: safeHousehold.priority },
  ];

  return {
    household: safeHousehold,
    airQuality: aq,
    recommendations,
    signals,
    prioritySummary: buildPrioritySummary(priority, aq, ctx, sensitivityPhrase, safeHousehold),
    tradeoffSummary: buildTradeoffSummary(priority),
    safetyCaveat: buildSafetyCaveat(ctx, aq, sensitivityPhrase),
    alternatives: buildSustainableAlternatives(safeHousehold, aq, ctx),
  };
}
