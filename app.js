const MAX_QUESTION_LENGTH = 300;

export const DEMO_LOCATIONS = {
  Delhi: {
    city: 'Delhi',
    aqi: 286,
    pm25: 168,
    pm10: 241,
    temperatureC: 14,
    wind: 'Calm',
    severity: 'Severe',
    interpretation:
      'Fine particles are high today. Limit unnecessary outdoor exposure, especially during stagnant traffic hours.',
    cleanerWindow: 'Early afternoon (1:00 PM – 3:30 PM) if wind picks up slightly',
    peakSmogWindows: 'Early morning (6:00 AM – 9:30 AM) and late evening (6:30 PM – 10:30 PM)',
    isDemo: true,
    isFallback: false,
  },
  Mumbai: {
    city: 'Mumbai',
    aqi: 132,
    pm25: 54,
    pm10: 91,
    temperatureC: 25,
    wind: 'Moderate',
    severity: 'Poor',
    interpretation:
      'Particle levels are elevated today. Sensitive family members should reduce intense outdoor exertion and shift errands away from busy roads.',
    cleanerWindow: 'Midday to mid-afternoon (11:30 AM – 3:30 PM)',
    peakSmogWindows: 'Morning rush (7:30 AM – 10:00 AM) and evening commute (6:00 PM – 9:00 PM)',
    isDemo: true,
    isFallback: false,
  },
  Bengaluru: {
    city: 'Bengaluru',
    aqi: 96,
    pm25: 38,
    pm10: 67,
    temperatureC: 21,
    wind: 'Light breeze',
    severity: 'Moderate',
    interpretation:
      'Air quality is moderate with a light breeze helping disperse traffic emissions. Midday windows are generally better than peak rush hours.',
    cleanerWindow: 'Midday (11:00 AM – 3:00 PM)',
    peakSmogWindows: 'Peak arterial traffic (8:00 AM – 10:30 AM and 5:30 PM – 8:30 PM)',
    isDemo: true,
    isFallback: false,
  },
  London: {
    city: 'London',
    aqi: 74,
    pm25: 28,
    pm10: 42,
    temperatureC: 9,
    wind: 'Breezy',
    severity: 'Moderate',
    interpretation:
      'Breezy winter air keeps particle buildup moderate, though roadside corridors remain higher during commute peaks.',
    cleanerWindow: 'Late morning to afternoon (10:30 AM – 3:30 PM)',
    peakSmogWindows: 'Cold calm mornings and evening rush (5:00 PM – 7:30 PM)',
    isDemo: true,
    isFallback: false,
  },
  'New York': {
    city: 'New York',
    aqi: 61,
    pm25: 19,
    pm10: 32,
    temperatureC: 7,
    wind: 'Moderate',
    severity: 'Moderate',
    interpretation:
      'Overall conditions are moderate. Routine outdoor activity is reasonable for most households, with light caution near heavy traffic.',
    cleanerWindow: 'Late morning through mid-afternoon (10:00 AM – 4:00 PM)',
    peakSmogWindows: 'Weekday corridor traffic peaks (7:30 AM – 9:30 AM and 4:30 PM – 7:00 PM)',
    isDemo: true,
    isFallback: false,
  },
};

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

export function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getAirQualityForCity(city) {
  const cleanCity = sanitizeText(city);
  if (cleanCity && Object.prototype.hasOwnProperty.call(DEMO_LOCATIONS, cleanCity)) {
    return { ...DEMO_LOCATIONS[cleanCity] };
  }
  return {
    ...DEMO_LOCATIONS.Delhi,
    city: cleanCity || 'Delhi',
    isFallback: true,
    interpretation:
      'Illustrative fallback demo data is shown because live or city-specific readings are unavailable. Limit unnecessary outdoor exposure during stagnant traffic hours.',
  };
}

export function validateHousehold(rawHousehold) {
  const input = rawHousehold && typeof rawHousehold === 'object' ? rawHousehold : {};
  const errors = {};

  const city = sanitizeText(input.city);
  if (!VALID_OPTIONS.cities.includes(city)) {
    errors.city = 'Please choose one of the available demo cities.';
  }

  const householdSize = sanitizeText(input.householdSize);
  if (!VALID_OPTIONS.householdSizes.includes(householdSize)) {
    errors.householdSize = 'Please select your household size.';
  }

  const rawSensitivities = Array.isArray(input.sensitivities) ? input.sensitivities : [];
  const sensitivities = rawSensitivities
    .map((item) => sanitizeText(item))
    .filter((item, index, arr) => VALID_OPTIONS.sensitivities.includes(item) && arr.indexOf(item) === index);
  if (sensitivities.length === 0) {
    errors.sensitivities = 'Select at least one sensitivity option, or choose "None of these".';
  } else if (sensitivities.includes('None of these') && sensitivities.length > 1) {
    errors.sensitivities = 'Choose either specific household sensitivities or "None of these".';
  }

  const travelMode = sanitizeText(input.travelMode);
  if (!VALID_OPTIONS.travelModes.includes(travelMode)) {
    errors.travelMode = 'Please select your main daily travel method.';
  }

  const outdoorTime = sanitizeText(input.outdoorTime);
  if (!VALID_OPTIONS.outdoorTimes.includes(outdoorTime)) {
    errors.outdoorTime = 'Please choose when outdoor activity usually happens.';
  }

  const rawIndoor = Array.isArray(input.indoor) ? input.indoor : [];
  const indoor = rawIndoor
    .map((item) => sanitizeText(item))
    .filter((item, index, arr) => VALID_OPTIONS.indoorOptions.includes(item) && arr.indexOf(item) === index);
  if (indoor.length === 0) {
    errors.indoor = 'Select at least one indoor environment condition, or choose "Not sure".';
  } else if (indoor.includes('Not sure') && indoor.length > 1) {
    errors.indoor = 'Choose either specific indoor conditions or "Not sure".';
  }

  const priority = sanitizeText(input.priority);
  if (!VALID_OPTIONS.priorities.includes(priority)) {
    errors.priority = 'Please select your main priority for today.';
  }

  const normalized = {
    city: VALID_OPTIONS.cities.includes(city) ? city : DEFAULT_HOUSEHOLD.city,
    householdSize: VALID_OPTIONS.householdSizes.includes(householdSize)
      ? householdSize
      : DEFAULT_HOUSEHOLD.householdSize,
    sensitivities: sensitivities.length > 0 ? sensitivities : [...DEFAULT_HOUSEHOLD.sensitivities],
    travelMode: VALID_OPTIONS.travelModes.includes(travelMode)
      ? travelMode
      : DEFAULT_HOUSEHOLD.travelMode,
    outdoorTime: VALID_OPTIONS.outdoorTimes.includes(outdoorTime)
      ? outdoorTime
      : DEFAULT_HOUSEHOLD.outdoorTime,
    indoor: indoor.length > 0 ? indoor : [...DEFAULT_HOUSEHOLD.indoor],
    priority: VALID_OPTIONS.priorities.includes(priority)
      ? priority
      : DEFAULT_HOUSEHOLD.priority,
  };

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized,
  };
}

function normalizeAirQuality(airQuality, fallbackCity) {
  if (!airQuality || typeof airQuality !== 'object') {
    return getAirQualityForCity(fallbackCity);
  }
  const base = getAirQualityForCity(airQuality.city || fallbackCity);
  const aqi = Number.isFinite(Number(airQuality.aqi)) ? Number(airQuality.aqi) : base.aqi;
  const pm25 = Number.isFinite(Number(airQuality.pm25)) ? Number(airQuality.pm25) : base.pm25;
  const pm10 = Number.isFinite(Number(airQuality.pm10)) ? Number(airQuality.pm10) : base.pm10;
  const severity = ['Severe', 'Poor', 'Moderate'].includes(airQuality.severity)
    ? airQuality.severity
    : aqi >= 200 || pm25 >= 120
      ? 'Severe'
      : aqi >= 101 || pm25 >= 45
        ? 'Poor'
        : 'Moderate';

  return {
    ...base,
    city: sanitizeText(airQuality.city) || base.city,
    aqi,
    pm25,
    pm10,
    temperatureC: Number.isFinite(Number(airQuality.temperatureC))
      ? Number(airQuality.temperatureC)
      : base.temperatureC,
    wind: sanitizeText(airQuality.wind) || base.wind,
    severity,
    interpretation: sanitizeText(airQuality.interpretation) || base.interpretation,
    cleanerWindow: sanitizeText(airQuality.cleanerWindow) || base.cleanerWindow,
    peakSmogWindows: sanitizeText(airQuality.peakSmogWindows) || base.peakSmogWindows,
    isDemo: airQuality.isDemo !== undefined ? Boolean(airQuality.isDemo) : base.isDemo,
    isFallback: airQuality.isFallback !== undefined ? Boolean(airQuality.isFallback) : base.isFallback,
  };
}

function analyzeContext(household, airQuality) {
  const sensitivities = household.sensitivities;
  const hasChild = sensitivities.includes('Child under 12');
  const hasOlderAdult = sensitivities.includes('Older adult');
  const hasRespiratory = sensitivities.includes('Asthma or respiratory sensitivity');
  const hasHeart = sensitivities.includes('Heart or cardiovascular sensitivity');
  const hasVulnerable = hasChild || hasOlderAdult || hasRespiratory || hasHeart;

  const indoor = household.indoor;
  const hasPurifier = indoor.includes('Air purifier available');
  const windowsCanClose = indoor.includes('Windows can be closed');
  const hasMechVent = indoor.includes('Mechanical ventilation available');
  const cookingWithGas = indoor.includes('Cooking with gas');
  const indoorNotSure = indoor.includes('Not sure');

  const isSevere = airQuality.severity === 'Severe' || airQuality.pm25 >= 120;
  const isPoor = !isSevere && (airQuality.severity === 'Poor' || airQuality.pm25 >= 45);
  const isModerate = !isSevere && !isPoor;

  const isOutdoorCommute = ['Walk', 'Cycle', 'Two-wheeler'].includes(household.travelMode);
  const isCar = household.travelMode === 'Private car';
  const isTransit = household.travelMode === 'Public transit';
  const isWfh = household.travelMode === 'Work from home';
  const canShiftSchedule = household.outdoorTime === 'Flexible';

  return {
    hasChild,
    hasOlderAdult,
    hasRespiratory,
    hasHeart,
    hasVulnerable,
    hasPurifier,
    windowsCanClose,
    hasMechVent,
    cookingWithGas,
    indoorNotSure,
    isSevere,
    isPoor,
    isModerate,
    isOutdoorCommute,
    isCar,
    isTransit,
    isWfh,
    canShiftSchedule,
  };
}

function formatSensitivityPhrase(sensitivities) {
  const map = {
    'Child under 12': 'a child under 12',
    'Older adult': 'an older adult',
    'Asthma or respiratory sensitivity': 'someone with asthma or respiratory sensitivity',
    'Heart or cardiovascular sensitivity': 'someone with heart or cardiovascular sensitivity',
  };
  const active = sensitivities.filter((s) => s !== 'None of these').map((s) => map[s] || s.toLowerCase());
  if (active.length === 0) {
    return 'sensitive household members';
  }
  if (active.length === 1) {
    return active[0];
  }
  return `${active.slice(0, -1).join(', ')} and ${active[active.length - 1]}`;
}

export function generatePlan({ household, airQuality } = {}) {
  const { normalized: safeHousehold } = validateHousehold(household);
  const aq = normalizeAirQuality(airQuality, safeHousehold.city);
  const ctx = analyzeContext(safeHousehold, aq);
  const priority = safeHousehold.priority;
  const sensitivityPhrase = formatSensitivityPhrase(safeHousehold.sensitivities);
  const isLargeHousehold = safeHousehold.householdSize === '5+ people';
  const isSmallHousehold = safeHousehold.householdSize === '1–2 people';
  const candidates = [];

  const addCandidate = (rec) => {
    candidates.push(rec);
  };

  // Priority weight helpers so each priority visibly reshapes ranking
  const exposureBoost = priority === 'Lowest exposure' ? 22 : priority === 'Balanced option' ? 4 : 0;
  const emissionsBoost = priority === 'Lowest emissions' ? 28 : priority === 'Balanced option' ? 4 : 0;
  const costBoost = priority === 'Lowest cost' ? 20 : 0;

  // 1. Outdoor activity, timing, and vulnerable household protection
  if (ctx.isSevere && ctx.hasChild) {
    addCandidate({
      id: 'outdoor-child-severe',
      score: 112 + exposureBoost + (priority === 'Lowest cost' ? 8 : 0),
      label: 'Outdoor play & exercise · Skip peak hours',
      action:
        'Keep children indoors for active play today and replace outdoor sports with calm indoor movement.',
      whyItMatters: `${aq.city} has severe fine-particle pollution (${aq.pm25} µg/m³ PM2.5) with ${aq.wind.toLowerCase()} air, and children breathe faster per body weight.`,
      directImpact: 'May reduce peak PM2.5 exposure during stagnant smog hours.',
      tradeoff: 'Requires organizing indoor games or quiet time at home instead of park play.',
      confidence: 'Usually helps lower total daily particle intake.',
    });
  } else if (ctx.isSevere || (ctx.isPoor && ctx.hasVulnerable)) {
    let timingAction = '';
    if (ctx.canShiftSchedule) {
      timingAction = `Because your schedule is flexible, move essential outdoor tasks to ${aq.cleanerWindow} and keep exertion light.`;
    } else if (safeHousehold.outdoorTime === 'Early morning') {
      timingAction =
        'Early morning traps winter smog near street level; pause outdoor workouts today or shift brief errands to midday when air mixes better.';
    } else if (safeHousehold.outdoorTime === 'Evening') {
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

    addCandidate({
      id: 'outdoor-timing-shift',
      score: 94 + exposureBoost + (ctx.hasVulnerable ? 12 : 0) + (priority === 'Lowest cost' ? 10 : 0),
      label: `Outdoor timing · ${safeHousehold.outdoorTime}`,
      action: timingAction,
      whyItMatters: `With PM2.5 at ${aq.pm25} µg/m³ (${aq.severity}) and ${aq.wind.toLowerCase()} conditions, ${safeHousehold.outdoorTime.toLowerCase()} routines carry higher particle exposure.${vulnNote}`,
      directImpact: 'May reduce peak PM2.5 exposure compared with exercising in stagnant traffic periods.',
      tradeoff: 'Shifting timing can conflict with school or work schedules and may shorten workouts.',
      confidence: 'A lower-exposure option when practical.',
    });
  } else {
    let modAction = '';
    if (ctx.canShiftSchedule) {
      modAction = `Schedule walks or exercise during ${aq.cleanerWindow} along tree-lined or residential streets.`;
    } else if (safeHousehold.outdoorTime === 'Midday') {
      modAction =
        'Your midday outdoor window already avoids rush-hour peaks; stick to parks or side streets away from arterial traffic.';
    } else {
      modAction = `During your ${safeHousehold.outdoorTime.toLowerCase()} routine, choose residential side streets at least a block away from bus and truck lanes.`;
    }

    addCandidate({
      id: 'outdoor-moderate-window',
      score: 74 + (priority === 'Lowest cost' ? 10 : 0) + (ctx.hasVulnerable ? 10 : 0),
      label: `Outdoor activity · ${safeHousehold.outdoorTime}`,
      action: modAction,
      whyItMatters: `Even on ${aq.severity.toLowerCase()} days (${aq.pm25} µg/m³ PM2.5), particle levels spike close to idling cars and buses${
        ctx.hasVulnerable ? ', which matters more for sensitive household members' : ''
      }.`,
      directImpact: 'May reduce roadside fine-particle exposure without giving up daily movement.',
      tradeoff: 'Quieter detour routes can add 5–10 minutes to a walk or run.',
      confidence: 'Usually helps reduce traffic-corridor exposure.',
    });
  }

  // 2. Travel, commute & remote-work guidance
  if (ctx.isWfh) {
    addCandidate({
      id: 'wfh-consolidate',
      score: 84 + emissionsBoost + (priority === 'Lowest cost' ? 12 : 0),
      label: 'Daily errands · Work-from-home day',
      action: isLargeHousehold
        ? `Keep ${safeHousehold.householdSize} off peak roads by batching groceries, school pick-ups, and errands into one midday loop.`
        : 'Stay off peak roads by batching groceries or pharmacy errands into a single midday trip or consolidated delivery.',
      whyItMatters: `Working from home already eliminates commute emissions; batching errands keeps your household out of ${aq.peakSmogWindows} traffic.`,
      directImpact: 'Reduces unnecessary vehicle emissions and avoids peak roadside PM2.5.',
      tradeoff: 'Requires planning errands ahead rather than making quick separate trips.',
      confidence: 'Usually helps keep both emissions and exposure lower.',
    });
  } else if (ctx.isOutdoorCommute && (ctx.isSevere || ctx.isPoor)) {
    const prefersEmissions = priority === 'Lowest emissions';
    const prefersCost = priority === 'Lowest cost';
    let commuteAction = '';
    if (prefersEmissions) {
      commuteAction = `When practical, switch today’s ${safeHousehold.travelMode.toLowerCase()} commute to enclosed public transit or shared travel, or shift timing outside rush hours.`;
    } else if (prefersCost) {
      commuteAction = `If switching from ${safeHousehold.travelMode.toLowerCase()} to transit is not in the budget today, leave outside ${aq.peakSmogWindows} and take quieter side streets away from heavy buses.`;
    } else {
      commuteAction = `Consider enclosed public transit or a shared ride instead of an open ${safeHousehold.travelMode.toLowerCase()} commute during ${aq.city}’s ${aq.severity.toLowerCase()} smog.`;
    }

    addCandidate({
      id: 'commute-outdoor-shift',
      score:
        92 +
        (prefersEmissions ? 26 : 0) +
        (priority === 'Lowest exposure' ? 16 : 0) +
        (ctx.isSevere ? 6 : 0),
      label: `Daily travel · ${safeHousehold.travelMode}`,
      action: commuteAction,
      whyItMatters: `Open ${safeHousehold.travelMode.toLowerCase()} commutes expose travelers directly to tailpipe exhaust while ${aq.city} sits at ${aq.aqi} AQI (${aq.severity}).`,
      directImpact:
        'May reduce direct roadside PM2.5 inhalation while keeping per-person transport emissions low.',
      tradeoff: prefersCost
        ? 'Side-street timing adds travel minutes, while transit trades zero fare for lower smog inhalation.'
        : 'Public transit or shared rides can take longer door-to-door and add modest fare cost compared with walking or cycling.',
      confidence: 'A lower-exposure and lower-emission option when practical.',
    });
  } else if (ctx.isCar) {
    const prefersEmissions = priority === 'Lowest emissions';
    addCandidate({
      id: 'commute-car-guidance',
      score: 82 + emissionsBoost + (ctx.isSevere ? 8 : 0) + (isLargeHousehold && prefersEmissions ? 6 : 0),
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
    addCandidate({
      id: 'commute-transit-guidance',
      score: 80 + emissionsBoost,
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
    // Moderate outdoor commute (Walk, Cycle, Two-wheeler)
    addCandidate({
      id: 'commute-active-moderate',
      score: 76 + emissionsBoost + (priority === 'Lowest cost' ? 8 : 0),
      label: `Daily travel · ${safeHousehold.travelMode}`,
      action:
        'Continue low-emission travel along quieter back streets, and keep a steady pace rather than riding right behind diesel buses or trucks.',
      whyItMatters:
        'Heavy breathing directly behind tailpipes pulls concentrated exhaust deeper into airways even on moderate days.',
      directImpact: 'Keeps daily travel low-emission while moderating roadside particle intake.',
      tradeoff: 'Side-street detours or a gentler pace can add 5–10 minutes to commute time.',
      confidence: 'Usually helps balance low emissions with lower exposure.',
    });
  }

  // Optional remote work / study option when Severe + non-WFH + Exposure or Balanced priority
  if (!ctx.isWfh && (ctx.isSevere || (ctx.isPoor && ctx.hasVulnerable)) && priority !== 'Lowest cost') {
    addCandidate({
      id: 'remote-work-study',
      score:
        84 +
        (ctx.isSevere ? 8 : 0) +
        (priority === 'Lowest exposure' ? 20 : 0) +
        (priority === 'Lowest emissions' ? 12 : 0),
      label: 'Schedule flexibility · Remote work or study',
      action:
        'When your workplace or school allows, work or study remotely today to skip peak-smog commuting altogether.',
      whyItMatters: `Skipping one commute day in ${aq.city} (${aq.aqi} AQI) eliminates both roadside exposure and daily commute emissions.`,
      directImpact: 'May substantially reduce daily peak PM2.5 inhalation and avoids commute emissions.',
      tradeoff: 'Not realistic for in-person roles, school labs, or households without remote options.',
      confidence: 'A high-impact lower-exposure option when practical.',
    });
  }

  // 3. Indoor air & window strategy
  if (ctx.windowsCanClose) {
    addCandidate({
      id: 'indoor-windows-timing',
      score: 92 + costBoost + (priority === 'Lowest exposure' ? 14 : 0) + (ctx.isSevere ? 8 : 0),
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
    });
  } else if (ctx.indoorNotSure) {
    addCandidate({
      id: 'indoor-check-seals',
      score: 84 + costBoost + (priority === 'Lowest exposure' ? 10 : 0),
      label: 'Indoor air · Check seals & airflow',
      action:
        'Check which room closes most tightly against outdoor drafts and use rolled towels along loose sills during peak smog hours.',
      whyItMatters:
        'When indoor sealing is uncertain, identifying one tighter interior room helps keep winter soot out during calm inversions.',
      directImpact: 'May reduce outdoor fine particles drifting into your main living space without cost.',
      tradeoff: 'Requires quick room checks and simple draft blocking rather than automated filtration.',
      confidence: 'Consider when practical as a zero-cost first step.',
    });
  } else {
    addCandidate({
      id: 'indoor-seal-gaps',
      score: 83 + costBoost + (priority === 'Lowest exposure' ? 10 : 0),
      label: 'Indoor air · Draft & zone control',
      action:
        'Use rolled towels or temporary weatherstripping on leaky window gaps in the room where your household spends the most time.',
      whyItMatters:
        'When windows do not seal tightly, winter smog seeps in continuously during calm inversions.',
      directImpact: 'May reduce outdoor fine particles drifting into your main living space.',
      tradeoff: 'Requires simple household setup and does not replace mechanical filtration.',
      confidence: 'Consider when practical as a low-cost barrier.',
    });
  }

  // 4. Cleaner-air room & purifier / sleep guidance
  if (ctx.hasPurifier) {
    const targetRoom = ctx.hasVulnerable
      ? `the closed bedroom used by ${sensitivityPhrase}`
      : 'your main closed bedroom';
    addCandidate({
      id: 'bedroom-purifier',
      score:
        88 +
        (ctx.hasVulnerable ? 10 : 0) +
        (priority === 'Lowest exposure' ? 18 : 0) +
        (priority === 'Lowest cost' ? -4 : 0),
      label: 'Evening & sleep · Bedroom air',
      action:
        priority === 'Lowest cost'
          ? `Close the door to ${targetRoom} and run your existing purifier on a low, energy-saving steady speed overnight rather than full blast all day.`
          : `Close the door to ${targetRoom} and run your HEPA air purifier on medium-high 45 minutes before bedtime, then keep it on a quiet steady speed overnight.`,
      whyItMatters:
        'Households spend 7–9 hours asleep; lowering particles in one closed bedroom gives lungs a long recovery break.',
      directImpact: 'May improve bedroom air quality before sleep.',
      tradeoff: 'Uses modest electricity and gentle fan noise overnight.',
      confidence: 'Usually helps lower indoor PM2.5 in closed rooms.',
    });
  } else {
    addCandidate({
      id: 'cleaner-room-no-cost',
      score:
        86 +
        (ctx.hasVulnerable ? 12 : 0) +
        costBoost +
        (ctx.isSevere ? 6 : 0),
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
    });
  }

  // 5. Indoor particle sources (gas cooking, incense, candles)
  addCandidate({
    id: 'indoor-combustion-control',
    score:
      81 +
      (ctx.cookingWithGas ? 15 : 0) +
      costBoost +
      (ctx.hasRespiratory ? 10 : 0) +
      (isLargeHousehold && ctx.cookingWithGas ? 6 : 0),
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
  });

  // 6. Mechanical ventilation or errand consolidation
  if (ctx.hasMechVent) {
    addCandidate({
      id: 'mech-vent-filter',
      score:
        90 +
        (ctx.isSevere ? 6 : 0) +
        (priority === 'Lowest exposure' ? 12 : 0) +
        (priority === 'Lowest cost' ? -4 : 0),
      label: 'Building airflow · Mechanical ventilation',
      action:
        priority === 'Lowest cost'
          ? 'Check if your building’s mechanical ventilation already uses clean filters before opening windows, and pause unfiltered outdoor intake during peak smog.'
          : 'Confirm your mechanical ventilation uses clean pleated filters (such as MERV-13 if supported) and avoid pulling unfiltered outdoor air during peak smog hours.',
      whyItMatters:
        'Unfiltered mechanical intake can pull outdoor PM2.5 indoors, whereas well-filtered systems supply fresh air without opening windows.',
      directImpact: 'May reduce outdoor particle entry while maintaining fresh indoor airflow.',
      tradeoff: 'Filter checks or upgrades depend on building access and system compatibility.',
      confidence: 'Consider when practical depending on building controls.',
    });
  }

  if (!ctx.isWfh) {
    addCandidate({
      id: 'errand-consolidation',
      score:
        75 +
        emissionsBoost +
        (priority === 'Lowest cost' ? 10 : 0) +
        (isSmallHousehold ? 0 : 4),
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

  // Sort deterministically by score descending, then id ascending
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const recommendations = candidates.slice(0, 6).map(({ score, ...rest }) => rest);

  // Build priority & tradeoff summaries for "Why this plan?"
  let prioritySummary = '';
  if (priority === 'Lowest exposure') {
    prioritySummary = `We prioritized exposure reduction because ${aq.city} is at ${aq.severity.toLowerCase()} PM2.5 (${aq.pm25} µg/m³)${
      ctx.hasVulnerable
        ? ` and your ${safeHousehold.householdSize} household includes ${sensitivityPhrase}`
        : ''
    }.`;
  } else if (priority === 'Lowest emissions') {
    prioritySummary = `We prioritized low-emission habits—transit, shared or batched trips, and zero-idling routines—adapted to ${aq.city}’s ${aq.severity.toLowerCase()} (${aq.pm25} µg/m³ PM2.5) conditions and your ${safeHousehold.travelMode.toLowerCase()} routine.`;
  } else if (priority === 'Lowest cost') {
    prioritySummary = `We prioritized free, immediate adjustments—window timing, schedule shifts, and avoiding indoor smoke—before suggesting any purchases.`;
  } else {
    prioritySummary = `We balanced exposure reduction and lower emissions because ${aq.city} is at ${aq.severity.toLowerCase()} PM2.5 (${aq.pm25} µg/m³)${
      ctx.hasVulnerable ? ` and your household includes ${sensitivityPhrase}` : ''
    }.`;
  }

  let tradeoffSummary = '';
  if (priority === 'Lowest emissions') {
    tradeoffSummary =
      'The lowest-emission option—such as walking or cycling beside heavy traffic—may not always be the lowest-exposure option during winter smog, so enclosed transit or quieter side-street timing is recommended.';
  } else if (priority === 'Lowest cost') {
    tradeoffSummary =
      'Free behavioral steps avoid equipment costs, though keeping windows shut during peak hours can feel warm or stale without brief midday airing.';
  } else if (priority === 'Lowest exposure') {
    tradeoffSummary =
      'Minimizing particle intake may require skipping outdoor exercise, shifting errands to midday, or choosing enclosed transit over open cycling or two-wheelers.';
  } else {
    tradeoffSummary =
      'The lowest-exposure option may take more planning or indoor time, while the lowest-emission option may require public transit, shared travel, or consolidated errands.';
  }

  let safetyCaveat = '';
  if (ctx.hasVulnerable && (ctx.isSevere || ctx.isPoor)) {
    safetyCaveat = `Because your household includes ${sensitivityPhrase} during ${aq.severity.toLowerCase()} air quality (${aq.pm25} µg/m³ PM2.5), keep outdoor time brief, watch for coughing or shortness of breath, and follow your clinician’s action plan if anyone has asthma or heart conditions.`;
  } else if (ctx.hasVulnerable) {
    safetyCaveat = `Even on moderate days, ${sensitivityPhrase} may experience irritation near heavy traffic. Keep any prescribed rescue medication handy.`;
  } else if (ctx.isSevere) {
    safetyCaveat =
      'At severe PM2.5 levels, even healthy adults may experience throat irritation or fatigue from prolonged outdoor exertion.';
  }

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

  const alternatives = buildSustainableAlternatives(safeHousehold, aq, ctx);

  return {
    household: safeHousehold,
    airQuality: aq,
    recommendations,
    signals,
    prioritySummary,
    tradeoffSummary,
    safetyCaveat,
    alternatives,
  };
}

function buildSustainableAlternatives(household, aq, ctx) {
  const alternatives = [
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

  return alternatives;
}

export function answerQuestion({ question, household, airQuality } = {}) {
  const cleanQuestion = sanitizeText(question);
  if (!cleanQuestion) {
    return {
      valid: false,
      error: 'Please enter a question about outdoor timing, windows, commuting, or indoor air.',
    };
  }
  if (cleanQuestion.length > MAX_QUESTION_LENGTH) {
    return {
      valid: false,
      error: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.`,
    };
  }

  const { normalized: safeHousehold } = validateHousehold(household);
  const aq = normalizeAirQuality(airQuality, safeHousehold.city);
  const ctx = analyzeContext(safeHousehold, aq);
  const q = cleanQuestion.toLowerCase();

  const isMedicalEmergencyOrDiagnosis =
    /\b(diagnos|prescrib|dosage|inhaler dose|medication|chest pain|faint|wheez|heart attack|asthma attack|doctor|emergency|cure|symptoms)\b/.test(
      q
    );

  if (isMedicalEmergencyOrDiagnosis) {
    return {
      valid: true,
      inScope: false,
      question: cleanQuestion,
      topic: 'Out of scope (medical)',
      directAnswer:
        'I can help with household routines, outdoor timing, transport choices, and indoor air practices. For urgent symptoms or medical decisions, contact a qualified healthcare professional.',
      reasoning:
        'ClearAir is an educational planning tool using illustrative demo conditions and cannot evaluate symptoms or give medical advice.',
      nextStep:
        'If anyone is experiencing serious breathing difficulty, chest pain, fainting, or severe wheezing, seek urgent medical care right away.',
      safetyCaveat:
        'Always rely on a qualified clinician for asthma action plans, medication adjustments, or symptom checks.',
    };
  }

  const sensitivityPhrase = formatSensitivityPhrase(safeHousehold.sensitivities);
  const safetyCaveat = ctx.hasVulnerable
    ? `Because your household includes ${sensitivityPhrase}, take extra caution on ${aq.severity.toLowerCase()} days and seek medical care for any breathing trouble.`
    : 'This guidance is educational, not medical advice, and uses illustrative demo air-quality values.';

  // Topic 1: Children & outdoor play
  if (/\b(child|children|kid|kids|son|daughter|baby|toddler|play|playground|school)\b/.test(q)) {
    if (ctx.isSevere) {
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Children & outdoor play',
        directAnswer: `Today is best for indoor play in ${aq.city}. Skip prolonged outdoor play while conditions remain severe.`,
        reasoning: `Demo readings show AQI ${aq.aqi} (${aq.pm25} µg/m³ PM2.5, ${aq.wind.toLowerCase()} wind), which is severe. Children breathe more air per kilogram of body weight and run harder during play.`,
        nextStep: ctx.hasPurifier
          ? 'Set up active indoor games in a closed-window room with your purifier running on a steady setting.'
          : 'Set up indoor play in a closed-window room away from kitchen smoke or incense—at zero extra cost.',
        safetyCaveat,
      };
    }
    if (ctx.isPoor) {
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Children & outdoor play',
        directAnswer: `Keep outdoor play brief and lower-intensity today in ${aq.city}, ideally during ${aq.cleanerWindow}.`,
        reasoning: `PM2.5 is elevated at ${aq.pm25} µg/m³ (${aq.severity}). Shorter play away from busy streets may reduce total particle intake compared with rush-hour parks.`,
        nextStep: 'Choose a quiet courtyard or park away from traffic and move indoors if anyone coughs or tires early.',
        safetyCaveat,
      };
    }
    return {
      valid: true,
      inScope: true,
      question: cleanQuestion,
      topic: 'Children & outdoor play',
      directAnswer: `Moderate outdoor play is reasonable in ${aq.city} today, especially away from busy roads.`,
      reasoning: `Demo conditions are ${aq.severity} (AQI ${aq.aqi}, PM2.5 ${aq.pm25} µg/m³, ${aq.wind.toLowerCase()}), though roadside corridors still peak during rush hours.`,
      nextStep: `Aim for ${aq.cleanerWindow} at parks set back from main roads.`,
      safetyCaveat,
    };
  }

  // Topic 2: Windows & ventilation
  if (/\b(window|windows|ventilat|open|air out|fresh air|draft|breeze)\b/.test(q)) {
    if (ctx.hasMechVent && (ctx.isSevere || ctx.isPoor)) {
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Windows & ventilation',
        directAnswer: `Keep windows closed in ${aq.city} today and rely on your mechanical ventilation if it is filtered.`,
        reasoning: `${aq.city} shows ${aq.pm25} µg/m³ PM2.5 (${aq.severity}). Filtered mechanical ventilation can supply fresh indoor airflow without letting unfiltered street smog blow inside.`,
        nextStep:
          'Verify that building filters are clean and keep street-facing windows shut during peak traffic hours.',
        safetyCaveat,
      };
    }
    if (!ctx.windowsCanClose) {
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Windows & ventilation',
        directAnswer:
          'Since your windows may not seal tightly, focus on reducing drafts in your main room and keeping indoor combustion near zero.',
        reasoning: `${aq.city} currently shows ${aq.pm25} µg/m³ PM2.5 (${aq.severity}). When outdoor air cannot be fully shut out, indoor smoke and gas cooking add directly to indoor particles.`,
        nextStep:
          'Use rolled towels along drafty sills in the main bedroom and vent kitchen steam while cooking.',
        safetyCaveat,
      };
    }
    if (ctx.isSevere || ctx.isPoor) {
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Windows & ventilation',
        directAnswer: `Keep windows closed now, especially during ${aq.peakSmogWindows}.`,
        reasoning: `With ${aq.city} at ${aq.pm25} µg/m³ PM2.5 (${aq.severity}) and ${aq.wind.toLowerCase()} air, open windows allow outdoor fine particles to settle indoors${
          ctx.hasPurifier ? ' and reduce your purifier’s effectiveness' : ''
        }.`,
        nextStep: ctx.cookingWithGas
          ? `Only crack a kitchen window briefly (10–15 minutes) while cooking with the kitchen door shut, or air out briefly during ${aq.cleanerWindow}.`
          : `Wait for ${aq.cleanerWindow} for a brief 10-minute cross-breeze if the room feels stuffy, then close up again.`,
        safetyCaveat,
      };
    }
    return {
      valid: true,
      inScope: true,
      question: cleanQuestion,
      topic: 'Windows & ventilation',
      directAnswer: `You can open windows briefly during ${aq.cleanerWindow}, while keeping street-facing windows shut at rush hour.`,
      reasoning: `In ${aq.city}, demo conditions are ${aq.severity} (${aq.pm25} µg/m³ PM2.5, ${aq.wind.toLowerCase()}), so daytime ventilation helps clear indoor CO2 and cooking moisture.`,
      nextStep: 'Open windows on the side away from main traffic for 15–20 minutes around midday.',
      safetyCaveat,
    };
  }

  // Topic 3: Commute, transit, car use & emissions (tailored by travelMode + severity + priority)
  if (
    /\b(commute|transit|bus|metro|train|car|drive|driving|cycle|cycling|bike|two-wheeler|scooter|emission|emissions|traffic|idling|errand|remote|work from home)\b/.test(
      q
    )
  ) {
    const lowEmissionNote =
      'Public transit (metro, train, or shared bus) or combining errands into one off-peak trip is usually the lowest-emission urban option.';
    if (ctx.isWfh) {
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Commute & emissions',
        directAnswer: `Working from home already keeps your commute emissions at zero in ${aq.city}. For errands, public transit or one batched off-peak trip is the lowest-emission choice.`,
        reasoning: `With ${aq.city} at AQI ${aq.aqi} (${aq.pm25} µg/m³ PM2.5, ${aq.severity}) and your priority set to ${safeHousehold.priority}, avoiding peak-hour road trips protects both emissions and air intake.`,
        nextStep: `Batch any errands into ${aq.cleanerWindow} and take enclosed transit or quiet side streets when practical.`,
        safetyCaveat,
      };
    }
    if (ctx.isSevere || ctx.isPoor) {
      let travelNextStep =
        'Take enclosed public transit if available, stand back from curb tailpipes while waiting, and batch errands into one trip.';
      if (ctx.isCar) {
        travelNextStep =
          'Consider public transit or carpooling when practical; if driving, switch cabin air to recirculate in congestion and avoid idling over 30 seconds.';
      } else if (ctx.isOutdoorCommute) {
        travelNextStep = `Switch your ${safeHousehold.travelMode.toLowerCase()} trip to enclosed transit if practical today, or shift off peak traffic onto quiet side streets.`;
      }
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Commute & emissions',
        directAnswer: `${lowEmissionNote} Today in ${aq.city} (${aq.severity}), enclosed public transit also lowers direct roadside exposure compared with walking, cycling, or a two-wheeler.`,
        reasoning: `Your current travel mode is ${safeHousehold.travelMode} and priority is ${safeHousehold.priority}. While cycling or walking produces zero tailpipe emissions, heavy breathing beside ${aq.pm25} µg/m³ PM2.5 traffic increases particle intake.`,
        nextStep: travelNextStep,
        safetyCaveat,
      };
    }
    return {
      valid: true,
      inScope: true,
      question: cleanQuestion,
      topic: 'Commute & emissions',
      directAnswer: `${lowEmissionNote} On a ${aq.severity.toLowerCase()} day like today in ${aq.city}, walking or cycling along quiet side streets is also a strong low-emission option.`,
      reasoning: `With AQI at ${aq.aqi} (${aq.pm25} µg/m³ PM2.5), shifting away from solo cars cuts neighborhood exhaust while keeping personal exposure manageable off main roads.`,
      nextStep: 'Choose side-street routes or public transit, and combine errands into a single loop.',
      safetyCaveat,
    };
  }

  // Topic 4: Bedroom air, purifiers, sleep & indoor quality
  if (
    /\b(bedroom|sleep|night|purifier|hepa|filter|indoor|room|air quality inside|gas|cook|incense|candle)\b/.test(
      q
    )
  ) {
    if (ctx.hasPurifier) {
      const lowCostPurifier = safeHousehold.priority === 'Lowest cost';
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Bedroom & indoor air',
        directAnswer: lowCostPurifier
          ? 'Close bedroom doors and windows before evening smog builds, and run your existing purifier on a low steady overnight speed to protect sleep air while keeping electricity use minimal.'
          : 'Close bedroom doors and windows before evening smog builds, and run your air purifier 45 minutes before bedtime and overnight on a quiet steady setting.',
        reasoning: `You indicated an air purifier is available while ${aq.city} is at ${aq.pm25} µg/m³ PM2.5 (${aq.severity}) and your priority is ${safeHousehold.priority}. Containing one bedroom helps filtration work effectively without fighting outdoor air.`,
        nextStep: ctx.cookingWithGas
          ? 'Keep the kitchen door closed and exhaust fan on while cooking with gas so cooking particles do not drift toward bedrooms.'
          : 'Check that the purifier intake is unobstructed and avoid burning candles or incense indoors.',
        safetyCaveat,
      };
    }
    return {
      valid: true,
      inScope: true,
      question: cleanQuestion,
      topic: 'Bedroom & indoor air',
      directAnswer:
        'Even without a purifier, you can create a cleaner-air bedroom by closing windows during peak smog, damp-dusting surfaces, and eliminating indoor smoke—without buying new products.',
      reasoning: `In ${aq.city} (${aq.pm25} µg/m³ PM2.5, ${aq.severity}), keeping one sleeping room closed during ${aq.peakSmogWindows} and free of incense, candles, or cooking fumes helps keep overnight particle levels lower—at zero cost.`,
      nextStep: ctx.cookingWithGas
        ? 'Keep bedroom doors shut while cooking with gas, use pot lids and kitchen exhaust, and wipe bedroom floors with a damp cloth.'
        : 'Close bedroom windows before evening traffic peaks, damp-wipe surfaces, and skip candles or incense.',
      safetyCaveat,
    };
  }

  // Topic 5: Outdoor exercise, walking, masks & sensitive adults
  if (
    /\b(exercise|walk|run|jog|workout|outdoor|outside|mask|n95|kn95|park|morning|evening|older|elderly|senior|asthma|heart)\b/.test(
      q
    )
  ) {
    if (ctx.isSevere) {
      return {
        valid: true,
        inScope: true,
        question: cleanQuestion,
        topic: 'Outdoor exercise & timing',
        directAnswer: `Hold off on vigorous outdoor exercise in ${aq.city} today and move workouts indoors${
          ctx.hasVulnerable ? `, especially with ${sensitivityPhrase} in your household` : ''
        }.`,
        reasoning: `At AQI ${aq.aqi} (${aq.pm25} µg/m³ PM2.5, ${aq.wind.toLowerCase()} wind), deep breathing during exercise pulls far more fine particles into the lungs, especially during ${safeHousehold.outdoorTime.toLowerCase()} traffic.`,
        nextStep:
          'Do gentle indoor stretching or bodyweight movement today; if an outdoor walk is unavoidable, keep the pace easy and consider a well-fitting N95/FFP2 respirator if comfortable.',
        safetyCaveat,
      };
    }
    return {
      valid: true,
      inScope: true,
      question: cleanQuestion,
      topic: 'Outdoor exercise & timing',
      directAnswer: `Aim for ${aq.cleanerWindow} on low-traffic paths rather than ${aq.peakSmogWindows}.`,
      reasoning: `${aq.city} is at ${aq.severity} (${aq.pm25} µg/m³ PM2.5). Midday warmth and ${aq.wind.toLowerCase()} airflow generally disperse street-level particles better than calm morning or evening hours, and your usual timing is ${safeHousehold.outdoorTime.toLowerCase()}.`,
      nextStep: ctx.hasVulnerable
        ? 'Keep intensity light-to-moderate, stay away from busy roads, and carry any prescribed reliever medication if anyone has asthma.'
        : 'Pick parks or residential streets away from bus corridors and shorten the session if air feels hazy.',
      safetyCaveat,
    };
  }

  // Fallback for unknown or out-of-scope questions
  return {
    valid: true,
    inScope: false,
    question: cleanQuestion,
    topic: 'Outside scope',
    directAnswer:
      'I can help with household routines, outdoor timing, transport choices, and indoor air practices. For urgent symptoms or medical decisions, contact a qualified healthcare professional.',
    reasoning:
      'Your question did not match ClearAir’s local topics (children’s outdoor play, exercise timing, windows, commuting, emissions, or bedroom air).',
    nextStep:
      'Try one of the quick questions above or ask specifically about windows, commuting, outdoor play, or bedroom air.',
    safetyCaveat:
      'Demo reasoning mode provides deterministic educational suggestions only.',
  };
}

// Browser UI Controller (guarded so Node unit tests import app.js cleanly)
if (typeof document !== 'undefined') {
  initClearAirApp();
}

function cloneDefaultHousehold() {
  return {
    ...DEFAULT_HOUSEHOLD,
    sensitivities: [...DEFAULT_HOUSEHOLD.sensitivities],
    indoor: [...DEFAULT_HOUSEHOLD.indoor],
  };
}

function initClearAirApp() {
  const sessionState = {
    household: cloneDefaultHousehold(),
    airQuality: getAirQualityForCity(DEFAULT_HOUSEHOLD.city),
    lastQuestion: '',
  };

  const contextCitySelect = document.getElementById('context-city-select');
  const householdCitySelect = document.getElementById('household-city');
  const aqSeverityPanel = document.getElementById('aq-severity-panel');
  const aqSeveritySymbol = document.getElementById('aq-severity-symbol');
  const aqSeverityText = document.getElementById('aq-severity-text');
  const aqInterpretation = document.getElementById('aq-interpretation');
  const aqAqi = document.getElementById('aq-aqi');
  const aqPm25 = document.getElementById('aq-pm25');
  const aqPm10 = document.getElementById('aq-pm10');
  const aqTemp = document.getElementById('aq-temp');
  const aqWind = document.getElementById('aq-wind');

  const householdForm = document.getElementById('household-form');
  const resetProfileBtn = document.getElementById('reset-profile-btn');
  const formErrorSummary = document.getElementById('form-error-summary');
  const planSection = document.getElementById('plan-section');
  const planLiveRegion = document.getElementById('plan-live-region');
  const planCount = document.getElementById('plan-count');
  const planSafetyBanner = document.getElementById('plan-safety-banner');
  const planSafetyText = document.getElementById('plan-safety-text');
  const planList = document.getElementById('plan-list');

  const whyPrioritySummary = document.getElementById('why-priority-summary');
  const whyTradeoffSummary = document.getElementById('why-tradeoff-summary');
  const signalsList = document.getElementById('signals-list');
  const alternativesGrid = document.getElementById('alternatives-grid');

  const assistantForm = document.getElementById('assistant-form');
  const assistantInput = document.getElementById('assistant-input');
  const assistantCharCount = document.getElementById('assistant-char-count');
  const assistantCharStatus = document.getElementById('assistant-char-status');
  const assistantError = document.getElementById('assistant-error');
  const assistantOutput = document.getElementById('assistant-output');
  const quickButtons = document.querySelectorAll('.quick-btn');

  let assistantTimerId = null;

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
      target: document.getElementById('main-travel'),
      getFocusEl: () => document.getElementById('main-travel'),
    },
    outdoorTime: {
      label: 'Typical outdoor activity',
      target: document.getElementById('outdoor-activity'),
      getFocusEl: () => document.getElementById('outdoor-activity'),
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

  function renderAirQuality(aq) {
    const symbolMap = {
      Severe: '!!',
      Poor: '!',
      Moderate: '~',
    };
    aqSeverityPanel.setAttribute('data-severity', aq.severity);
    aqSeveritySymbol.textContent = symbolMap[aq.severity] || '!';
    aqSeverityText.textContent = `Severity: ${aq.severity}`;
    aqInterpretation.textContent = aq.interpretation;
    aqAqi.textContent = String(aq.aqi);
    aqPm25.textContent = `${aq.pm25} µg/m³`;
    aqPm10.textContent = `${aq.pm10} µg/m³`;
    aqTemp.textContent = `${aq.temperatureC}°C`;
    aqWind.textContent = aq.wind;
  }

  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function appendDefinitionRow(dl, term, description, className) {
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

  function renderPlan(planResult) {
    planCount.textContent = `${planResult.recommendations.length} steps`;

    if (planResult.safetyCaveat) {
      planSafetyBanner.hidden = false;
      planSafetyText.textContent = planResult.safetyCaveat;
    } else {
      planSafetyBanner.hidden = true;
      planSafetyText.textContent = '';
    }

    clearChildren(planList);
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
      planList.appendChild(li);
    });

    // Transparency section
    whyPrioritySummary.textContent = planResult.prioritySummary;
    whyTradeoffSummary.textContent = planResult.tradeoffSummary;

    clearChildren(signalsList);
    planResult.signals.forEach((sig) => {
      appendDefinitionRow(signalsList, sig.label, sig.value, 'signal-item');
    });

    // Sustainable alternatives
    clearChildren(alternativesGrid);
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
      alternativesGrid.appendChild(card);
    });
  }

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
    clearChildren(formErrorSummary);
    Object.keys(fieldControlMap).forEach((key) => {
      clearFieldError(key);
    });
  }

  function showFormErrors(errors) {
    const messages = Object.entries(errors);
    clearChildren(formErrorSummary);
    formErrorSummary.hidden = false;

    const title = document.createElement('p');
    title.className = 'error-summary-title';
    title.textContent = `Please fix ${messages.length} ${
      messages.length === 1 ? 'field' : 'fields'
    } before building your plan:`;
    formErrorSummary.appendChild(title);

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

    formErrorSummary.appendChild(list);
    formErrorSummary.focus({ preventScroll: true });
    formErrorSummary.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }

  function syncCheckboxExclusivity(groupName, exclusiveValue, changedInput) {
    const checkboxes = Array.from(
      householdForm.querySelectorAll(`input[name="${groupName}"]`)
    );
    if (changedInput.value === exclusiveValue && changedInput.checked) {
      checkboxes.forEach((cb) => {
        if (cb.value !== exclusiveValue) {
          cb.checked = false;
        }
      });
    } else if (changedInput.value !== exclusiveValue && changedInput.checked) {
      checkboxes.forEach((cb) => {
        if (cb.value === exclusiveValue) {
          cb.checked = false;
        }
      });
    }
  }

  function setFormToDefaults() {
    householdCitySelect.value = DEFAULT_HOUSEHOLD.city;
    contextCitySelect.value = DEFAULT_HOUSEHOLD.city;

    householdForm.querySelectorAll('input[name="householdSize"]').forEach((input) => {
      input.checked = input.value === DEFAULT_HOUSEHOLD.householdSize;
    });
    householdForm.querySelectorAll('input[name="sensitivities"]').forEach((input) => {
      input.checked = DEFAULT_HOUSEHOLD.sensitivities.includes(input.value);
    });
    document.getElementById('main-travel').value = DEFAULT_HOUSEHOLD.travelMode;
    document.getElementById('outdoor-activity').value = DEFAULT_HOUSEHOLD.outdoorTime;
    householdForm.querySelectorAll('input[name="indoor"]').forEach((input) => {
      input.checked = DEFAULT_HOUSEHOLD.indoor.includes(input.value);
    });
    householdForm.querySelectorAll('input[name="priority"]').forEach((input) => {
      input.checked = input.value === DEFAULT_HOUSEHOLD.priority;
    });
  }

  function renderAssistantResponse(result) {
    clearChildren(assistantOutput);

    const echo = document.createElement('p');
    echo.className = 'assistant-question-echo';
    echo.textContent = `Question: "${result.question}"`;
    assistantOutput.appendChild(echo);

    const dl = document.createElement('dl');
    dl.className = 'assistant-response-grid';
    appendDefinitionRow(dl, 'Direct answer', result.directAnswer, 'assistant-block');
    appendDefinitionRow(dl, 'Reasoning from your context', result.reasoning, 'assistant-block');
    appendDefinitionRow(dl, 'Practical next step', result.nextStep, 'assistant-block');

    assistantOutput.appendChild(dl);

    if (result.safetyCaveat) {
      const caveat = document.createElement('p');
      caveat.className = 'assistant-caveat';
      caveat.textContent = result.safetyCaveat;
      assistantOutput.appendChild(caveat);
    }
  }

  function askAssistant(rawQuestion) {
    if (assistantTimerId !== null) {
      clearTimeout(assistantTimerId);
      assistantTimerId = null;
    }

    const previewCheck = answerQuestion({
      question: rawQuestion,
      household: sessionState.household,
      airQuality: sessionState.airQuality,
    });

    if (!previewCheck.valid) {
      assistantError.hidden = false;
      assistantError.textContent = previewCheck.error;
      assistantInput.setAttribute('aria-invalid', 'true');
      assistantInput.focus();
      return;
    }

    assistantError.hidden = true;
    assistantError.textContent = '';
    assistantInput.removeAttribute('aria-invalid');
    sessionState.lastQuestion = previewCheck.question;

    if (prefersReducedMotion()) {
      assistantOutput.removeAttribute('aria-busy');
      renderAssistantResponse(previewCheck);
      return;
    }

    assistantOutput.setAttribute('aria-busy', 'true');
    clearChildren(assistantOutput);
    const loading = document.createElement('p');
    loading.className = 'assistant-loading';
    loading.textContent = `Checking ${sessionState.airQuality.city} conditions and your household context…`;
    assistantOutput.appendChild(loading);

    assistantTimerId = setTimeout(() => {
      assistantTimerId = null;
      const response = answerQuestion({
        question: rawQuestion,
        household: sessionState.household,
        airQuality: sessionState.airQuality,
      });
      assistantOutput.removeAttribute('aria-busy');
      renderAssistantResponse(response);
    }, 140);
  }

  function syncAndRenderPlan(city) {
    const aq = getAirQualityForCity(city);
    sessionState.airQuality = aq;
    sessionState.household.city = aq.city;
    contextCitySelect.value = aq.city;
    householdCitySelect.value = aq.city;
    renderAirQuality(aq);

    const planResult = generatePlan({
      household: sessionState.household,
      airQuality: sessionState.airQuality,
    });
    renderPlan(planResult);

    if (sessionState.lastQuestion) {
      const refreshed = answerQuestion({
        question: sessionState.lastQuestion,
        household: sessionState.household,
        airQuality: sessionState.airQuality,
      });
      if (refreshed.valid) {
        renderAssistantResponse(refreshed);
      }
    }

    return planResult;
  }

  function updateCityContext(city, announce) {
    syncAndRenderPlan(city);
    if (announce) {
      const aq = sessionState.airQuality;
      planLiveRegion.textContent = `Updated air-quality context and plan for ${aq.city} (${aq.severity}, AQI ${aq.aqi}).`;
    }
  }

  // Event listeners
  contextCitySelect.addEventListener('change', (event) => {
    updateCityContext(event.target.value, true);
  });

  householdCitySelect.addEventListener('change', (event) => {
    clearFieldError('city');
    updateCityContext(event.target.value, true);
  });

  householdForm.addEventListener('change', (event) => {
    const target = event.target;
    if (target.name === 'sensitivities') {
      syncCheckboxExclusivity('sensitivities', 'None of these', target);
    } else if (target.name === 'indoor') {
      syncCheckboxExclusivity('indoor', 'Not sure', target);
    }

    if (target.name && Object.prototype.hasOwnProperty.call(fieldControlMap, target.name)) {
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
