/**
 * Data processing utilities for the Airport Congestion Dashboard.
 * 
 * Handles:
 * 1. Historical monthly passenger traffic analysis (airport_monthly.csv).
 * 2. AirLabs live scheduled flight processing with airport filtering and codeshare deduplication.
 * 3. Accurate delay status distinctions (delayed, known on-time, unknown, cancelled).
 * 4. Bounded normalization for activity and delay components of the congestion indicator.
 */

// --- Timestamp and Date Helpers ---

export function parseTimeToMs(timeStr) {
  if (!timeStr) return null;
  try {
    const clean = String(timeStr).trim().replace(' ', 'T');
    const d = new Date(clean.includes('Z') || clean.includes('+') ? clean : clean + 'Z');
    const t = d.getTime();
    return isNaN(t) ? null : t;
  } catch {
    return null;
  }
}

export function normalizeTimestamp(timeStr) {
  if (!timeStr) return '';
  const ms = parseTimeToMs(timeStr);
  if (ms != null) {
    // Round to nearest minute for stable equality comparison
    return Math.floor(ms / 60000).toString();
  }
  return String(timeStr).trim().slice(0, 16);
}

// --- Historical Passenger Traffic Functions (airport_monthly.csv) ---
// NOTE ON UNITS: In airport_monthly.csv, 'departures' represents embarked passengers
// and 'arrivals' represents disembarked passengers. Their sum is 'passengers'.
// These represent PASSENGER counts (people), NOT aircraft flight movements.

export function aggregateYearly(records) {
  if (!Array.isArray(records)) return [];
  const byYear = {};

  for (const record of records) {
    if (record.passengers == null && record.departures == null && record.arrivals == null) continue;

    const year = record.year;
    if (!byYear[year]) {
      byYear[year] = {
        year,
        passengers: 0,
        departures: 0, // Embarking passengers
        arrivals: 0,   // Disembarking passengers
        months: 0,
        hasPassengerData: false,
        hasFlightData: true, // Maintained for chart compatibility
      };
    }
    if (record.passengers != null) {
      byYear[year].passengers += record.passengers;
      byYear[year].hasPassengerData = true;
    }
    if (record.departures != null) {
      byYear[year].departures += record.departures;
    }
    if (record.arrivals != null) {
      byYear[year].arrivals += record.arrivals;
    }
    byYear[year].months += 1;
  }

  return Object.values(byYear)
    .sort((a, b) => a.year - b.year)
    .map(y => ({
      ...y,
      isPartial: y.months < 12,
    }));
}

export function aggregateMonthlySeasonality(records) {
  if (!Array.isArray(records)) return [];
  const byMonth = {};

  for (const record of records) {
    if (record.passengers == null) continue;
    const month = record.month;
    if (!byMonth[month]) {
      byMonth[month] = { month, total: 0, count: 0, years: [] };
    }
    byMonth[month].total += record.passengers;
    byMonth[month].count += 1;
    byMonth[month].years.push(record.year);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const data = byMonth[month];
    return {
      month,
      monthName: monthNames[i],
      avgPassengers: data && data.count > 0 ? Math.round(data.total / data.count) : 0,
      totalPassengers: data ? data.total : 0,
      yearCount: data ? data.count : 0,
      years: data ? data.years : [],
    };
  }).filter(d => d.yearCount > 0);
}

export function calculateYearOverYearGrowth(yearlyData) {
  if (!Array.isArray(yearlyData)) return [];
  const growth = [];

  for (let i = 1; i < yearlyData.length; i++) {
    const prev = yearlyData[i - 1];
    const curr = yearlyData[i];

    if (prev.passengers > 0 && curr.hasPassengerData) {
      const growthPct = ((curr.passengers - prev.passengers) / prev.passengers) * 100;
      growth.push({
        year: curr.year,
        growth: growthPct,
        current: curr.passengers,
        previous: prev.passengers,
        isPartial: Boolean(curr.isPartial || prev.isPartial),
      });
    }
  }

  return growth;
}

export function getAnnualSummary(yearlyData) {
  if (!Array.isArray(yearlyData) || !yearlyData.length) return null;

  const validYears = yearlyData.filter(y => y.hasPassengerData);
  if (!validYears.length) return null;

  const latest = validYears[validYears.length - 1];
  const previous = validYears.length > 1 ? validYears[validYears.length - 2] : null;

  const highest = validYears.reduce((max, y) =>
    y.passengers > max.passengers ? y : max, validYears[0]);

  let growth = null;
  if (previous && previous.passengers > 0) {
    growth = ((latest.passengers - previous.passengers) / previous.passengers) * 100;
  }

  return {
    latestYear: latest.year,
    latestPassengers: latest.passengers,
    latestIsPartial: latest.isPartial,
    previousYear: previous?.year ?? null,
    previousPassengers: previous?.passengers ?? null,
    growthPercent: growth,
    latestDepartures: latest.departures, // Embarking passengers
    latestArrivals: latest.arrivals,     // Disembarking passengers
    highestYear: highest.year,
    highestPassengers: highest.passengers,
  };
}

export function getHistoricalMonthlyInsight(records) {
  if (!Array.isArray(records) || !records.length) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const currentMonthRecords = records.filter(r => r.month === currentMonth);
  if (!currentMonthRecords.length) return null;

  const latestCurrentMonth = currentMonthRecords.reduce((latest, r) =>
    r.year > latest.year ? r : latest, currentMonthRecords[0]);

  const previousMonthRecord = currentMonthRecords.find(r => r.year === latestCurrentMonth.year - 1);

  let passengerChange = null;
  let departureChange = null;
  let arrivalChange = null;

  if (previousMonthRecord) {
    if (latestCurrentMonth.passengers != null && previousMonthRecord.passengers != null && previousMonthRecord.passengers > 0) {
      passengerChange = ((latestCurrentMonth.passengers - previousMonthRecord.passengers) / previousMonthRecord.passengers) * 100;
    }
    if (latestCurrentMonth.departures != null && previousMonthRecord.departures != null && previousMonthRecord.departures > 0) {
      departureChange = ((latestCurrentMonth.departures - previousMonthRecord.departures) / previousMonthRecord.departures) * 100;
    }
    if (latestCurrentMonth.arrivals != null && previousMonthRecord.arrivals != null && previousMonthRecord.arrivals > 0) {
      arrivalChange = ((latestCurrentMonth.arrivals - previousMonthRecord.arrivals) / previousMonthRecord.arrivals) * 100;
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    month: currentMonth,
    monthName: monthNames[currentMonth - 1],
    currentYear: latestCurrentMonth.year,
    currentPassengers: latestCurrentMonth.passengers,
    currentDepartures: latestCurrentMonth.departures,
    currentArrivals: latestCurrentMonth.arrivals,
    previousYear: previousMonthRecord?.year ?? null,
    previousPassengers: previousMonthRecord?.passengers ?? null,
    previousDepartures: previousMonthRecord?.departures ?? null,
    previousArrivals: previousMonthRecord?.arrivals ?? null,
    passengerChange,
    departureChange,
    arrivalChange,
  };
}

/**
 * Historical records from airport_monthly.csv contain passenger counts (people),
 * not aircraft flight movements.
 * This function documents that distinction and prevents mixing passenger totals with flight movements.
 */
export function getAirportOperationalBaseline(records, airportCode) {
  if (!records || !records.length) return null;

  return {
    airport: airportCode,
    hasFlightMovementBaseline: false,
    source: 'airport_monthly.csv',
    note: 'Historical dataset tracks passenger traffic (embarkations/disembarkations), not aircraft flight movements. Operational baseline uses transparent bounded scaling.',
  };
}

// --- Live Flights Processing & Codeshare Deduplication ---

export function processLiveFlights(flightsData, airportCode = '') {
  if (!flightsData) return null;

  const cleanCode = (airportCode || '').trim().toUpperCase();

  const rawDepartures = Array.isArray(flightsData.departures) ? flightsData.departures : [];
  const rawArrivals = Array.isArray(flightsData.arrivals) ? flightsData.arrivals : [];

  // 1. Strict filtering by selected airport
  const filteredDepartures = rawDepartures.filter(f => {
    if (!cleanCode) return true;
    const orig = (f.origin || '').trim().toUpperCase();
    return orig === cleanCode;
  });

  const filteredArrivals = rawArrivals.filter(f => {
    if (!cleanCode) return true;
    const dest = (f.destination || '').trim().toUpperCase();
    return dest === cleanCode;
  });

  // Helper to extract or calculate delay minutes
  const getDelayMinutes = (flight, direction) => {
    let raw = null;
    if (direction === 'dep') {
      if (flight.dep_delayed != null) raw = Number(flight.dep_delayed);
      else if (flight.delayed != null) raw = Number(flight.delayed);
    } else {
      if (flight.arr_delayed != null) raw = Number(flight.arr_delayed);
      else if (flight.delayed != null) raw = Number(flight.delayed);
    }

    if (raw != null && !isNaN(raw)) {
      return raw;
    }

    // Fallback: calculate delay from estimated/actual vs scheduled timestamps
    const schedStr = direction === 'dep' ? flight.scheduled_departure : flight.scheduled_arrival;
    const estStr = direction === 'dep'
      ? (flight.estimated_departure || flight.actual_departure)
      : (flight.estimated_arrival || flight.actual_arrival);

    if (schedStr && estStr) {
      const schedMs = parseTimeToMs(schedStr);
      const estMs = parseTimeToMs(estStr);
      if (schedMs != null && estMs != null) {
        return Math.round((estMs - schedMs) / 60000);
      }
    }

    return null;
  };

  const isCancelled = (flight) => {
    const s = (flight.status || '').toLowerCase();
    return s === 'cancelled' || s === 'canceled';
  };

  // Classifies delay into 'delayed', 'on_time', 'cancelled', or 'unknown'
  const classifyFlightStatus = (flight, direction) => {
    if (isCancelled(flight)) {
      return 'cancelled';
    }

    const delayMin = getDelayMinutes(flight, direction);
    if (delayMin != null) {
      return delayMin > 0 ? 'delayed' : 'on_time';
    }

    const s = (flight.status || '').toLowerCase();
    if (s === 'delayed' || s === 'diverted') {
      return 'delayed';
    }

    // Flights without explicit delay telemetry or estimated/actual differences are unknown
    return 'unknown';
  };

  // 2. Codeshare & duplicate deduplication
  const dedupeOperations = (flights, direction) => {
    const seenRouteTime = new Map();
    const seenFlightKey = new Set();
    const unique = [];
    let codesharesConsolidated = 0;
    let duplicateRecords = 0;

    for (const flight of flights) {
      const fn = (flight.flight_number || '').trim().toUpperCase();
      const timeVal = direction === 'dep'
        ? (flight.scheduled_departure || flight.actual_departure || '')
        : (flight.scheduled_arrival || flight.actual_arrival || '');
      const normTime = normalizeTimestamp(timeVal);
      const orig = (flight.origin || '').trim().toUpperCase();
      const dest = (flight.destination || '').trim().toUpperCase();

      // Check 1: Exact duplicate record (same flight number and same minute)
      const flightKey = (fn && normTime) ? `${fn}@${normTime}` : null;
      if (flightKey && seenFlightKey.has(flightKey)) {
        duplicateRecords++;
        continue;
      }

      // Check 2: Codeshare on the same physical flight (same route and same scheduled minute)
      const routeTimeKey = (normTime && orig && dest) ? `${orig}->${dest}@${normTime}` : null;
      if (routeTimeKey && seenRouteTime.has(routeTimeKey)) {
        codesharesConsolidated++;
        const primaryFlight = seenRouteTime.get(routeTimeKey);
        if (!primaryFlight.codeshares) primaryFlight.codeshares = [];
        if (fn && !primaryFlight.codeshares.includes(fn)) {
          primaryFlight.codeshares.push(fn);
        }
        // If the secondary record has delay data and primary doesn't, copy delay info
        const secDelay = getDelayMinutes(flight, direction);
        if (secDelay != null && getDelayMinutes(primaryFlight, direction) == null) {
          if (direction === 'dep') primaryFlight.dep_delayed = secDelay;
          else primaryFlight.arr_delayed = secDelay;
        }
        continue;
      }

      const copy = { ...flight };
      copy.statusCategory = classifyFlightStatus(copy, direction);
      copy.computedDelayMinutes = getDelayMinutes(copy, direction);

      if (flightKey) seenFlightKey.add(flightKey);
      if (routeTimeKey) seenRouteTime.set(routeTimeKey, copy);
      unique.push(copy);
    }

    return { unique, codesharesConsolidated, duplicateRecords };
  };

  const depResult = dedupeOperations(filteredDepartures, 'dep');
  const arrResult = dedupeOperations(filteredArrivals, 'arr');

  const uniqueDepartures = depResult.unique;
  const uniqueArrivals = arrResult.unique;

  // 3. Operational Counts & Status Breakdown
  const delayedDepartures = uniqueDepartures.filter(f => f.statusCategory === 'delayed').length;
  const delayedArrivals = uniqueArrivals.filter(f => f.statusCategory === 'delayed').length;
  const totalDelayed = delayedDepartures + delayedArrivals;

  const onTimeDepartures = uniqueDepartures.filter(f => f.statusCategory === 'on_time').length;
  const onTimeArrivals = uniqueArrivals.filter(f => f.statusCategory === 'on_time').length;
  const onTimeTotal = onTimeDepartures + onTimeArrivals;

  const unknownDepartures = uniqueDepartures.filter(f => f.statusCategory === 'unknown').length;
  const unknownArrivals = uniqueArrivals.filter(f => f.statusCategory === 'unknown').length;
  const unknownTotal = unknownDepartures + unknownArrivals;

  const cancelledDepartures = uniqueDepartures.filter(f => f.statusCategory === 'cancelled').length;
  const cancelledArrivals = uniqueArrivals.filter(f => f.statusCategory === 'cancelled').length;
  const cancelledCount = cancelledDepartures + cancelledArrivals;

  // Known delay status denominator excludes unknown and cancelled flights
  const knownDelayDepartures = delayedDepartures + onTimeDepartures;
  const knownDelayArrivals = delayedArrivals + onTimeArrivals;
  const totalWithKnownDelayStatus = knownDelayDepartures + knownDelayArrivals;

  // Delay rate calculation with safe denominator
  const delayRate = totalWithKnownDelayStatus > 0 ? (totalDelayed / totalWithKnownDelayStatus) * 100 : null;

  // Distinct flight numbers across departures and arrivals
  const distinctFlightNumbers = new Set();
  for (const f of uniqueDepartures) {
    const fn = (f.flight_number || '').trim().toUpperCase();
    if (fn) distinctFlightNumbers.add(fn);
  }
  for (const f of uniqueArrivals) {
    const fn = (f.flight_number || '').trim().toUpperCase();
    if (fn) distinctFlightNumbers.add(fn);
  }
  const totalUniqueFlights = distinctFlightNumbers.size > 0 ? distinctFlightNumbers.size : (uniqueDepartures.length + uniqueArrivals.length);

  // Active / airborne operations
  const activeDepartures = uniqueDepartures.filter(f => {
    const s = (f.status || '').toLowerCase();
    return s === 'active' || s === 'en-route';
  }).length;
  const activeArrivals = uniqueArrivals.filter(f => {
    const s = (f.status || '').toLowerCase();
    return s === 'active' || s === 'en-route';
  }).length;

  // 4. API Provider Metadata & Pagination Status
  const meta = flightsData.metadata || {};
  const depTotalReported = meta.departures_total_reported != null ? Number(meta.departures_total_reported) : null;
  const arrTotalReported = meta.arrivals_total_reported != null ? Number(meta.arrivals_total_reported) : null;
  const totalReported = (depTotalReported != null || arrTotalReported != null)
    ? ((depTotalReported || 0) + (arrTotalReported || 0))
    : null;

  const depFetched = meta.departures_fetched != null ? Number(meta.departures_fetched) : filteredDepartures.length;
  const arrFetched = meta.arrivals_fetched != null ? Number(meta.arrivals_fetched) : filteredArrivals.length;
  const totalFetched = depFetched + arrFetched;

  const isPartial = Boolean(
    meta.is_partial ||
    (totalReported != null && totalFetched < totalReported) ||
    (depTotalReported != null && depFetched < depTotalReported) ||
    (arrTotalReported != null && arrFetched < arrTotalReported)
  );

  // 5. Top 10 Upcoming Departures and Arrivals (future scheduled flights)
  const now = new Date();
  const nowMs = now.getTime();

  const upcomingDepartures = uniqueDepartures
    .filter(f => !isCancelled(f))
    .map(f => ({ ...f, scheduledMs: parseTimeToMs(f.scheduled_departure) }))
    .filter(f => f.scheduledMs && f.scheduledMs >= nowMs)
    .sort((a, b) => a.scheduledMs - b.scheduledMs)
    .slice(0, 10)
    .map(f => ({
      flight_number: f.flight_number,
      airline: f.airline,
      destination: f.destination,
      scheduled_departure: f.scheduled_departure,
      status: f.status,
      delay_minutes: f.computedDelayMinutes,
      codeshares: f.codeshares || [],
    }));

  const upcomingArrivals = uniqueArrivals
    .filter(f => !isCancelled(f))
    .map(f => ({ ...f, scheduledMs: parseTimeToMs(f.scheduled_arrival) }))
    .filter(f => f.scheduledMs && f.scheduledMs >= nowMs)
    .sort((a, b) => a.scheduledMs - b.scheduledMs)
    .slice(0, 10)
    .map(f => ({
      flight_number: f.flight_number,
      airline: f.airline,
      origin: f.origin,
      scheduled_arrival: f.scheduled_arrival,
      status: f.status,
      delay_minutes: f.computedDelayMinutes,
      codeshares: f.codeshares || [],
    }));

  return {
    // Unique deduplicated operations
    uniqueDepartures: uniqueDepartures.length,
    uniqueArrivals: uniqueArrivals.length,
    totalUniqueOperations: uniqueDepartures.length + uniqueArrivals.length,
    totalUniqueFlights,

    // Raw retrieved records
    rawDeparturesCount: filteredDepartures.length,
    rawArrivalsCount: filteredArrivals.length,
    totalRecordsFetched: totalFetched,

    // Codeshare consolidation stats
    departuresCodeshareCount: depResult.codesharesConsolidated,
    arrivalsCodeshareCount: arrResult.codesharesConsolidated,
    totalCodesharesConsolidated: depResult.codesharesConsolidated + arrResult.codesharesConsolidated,

    // Provider reported totals and pagination
    departuresTotalReported: depTotalReported,
    arrivalsTotalReported: arrTotalReported,
    totalReported,
    isPartial,

    // Delay counts and rate
    delayedDepartures,
    delayedArrivals,
    totalDelayed,
    knownDelayDepartures,
    knownDelayArrivals,
    totalWithKnownDelayStatus,
    delayRate,

    // Status distinctions
    onTimeDepartures,
    onTimeArrivals,
    onTimeTotal,
    unknownDepartures,
    unknownArrivals,
    unknownTotal,
    cancelledCount,
    cancelledDepartures,
    cancelledArrivals,
    activeDepartures,
    activeArrivals,
    totalActive: activeDepartures + activeArrivals,

    // Upcoming flight lists
    upcomingDepartures,
    upcomingArrivals,
    rawDepartures: uniqueDepartures,
    rawArrivals: uniqueArrivals,
  };
}

// --- Congestion Score Calculation ---

/**
 * Calculates a normalized congestion score (0–100) based on:
 * 1. Flight activity component (70% weight): normalized against a documented
 *    bounded major hub commercial capacity reference (1,000 daily movements).
 *    Estimated daily volume is scaled if provider reported total schedule items.
 * 2. Delay component (30% weight): calculated from the proportion of delayed flights
 *    among operations with known delay status.
 *
 * Weighting: score = 0.70 * activity_component + 0.30 * delay_component
 * Missing delay information is explicitly handled without assuming zero delay.
 */
export function calculateCongestionScore(liveData, baseline = null) {
  if (!liveData) return null;

  const ACTIVITY_WEIGHT = 0.70;
  const DELAY_WEIGHT = 0.30;

  // --- 1. Flight Activity Component (70% weight) ---
  const uniqueRetrieved = liveData.totalUniqueOperations || 0;
  const rawRetrieved = (liveData.rawDeparturesCount || 0) + (liveData.rawArrivalsCount || 0);
  const dedupeRatio = rawRetrieved > 0 ? (uniqueRetrieved / rawRetrieved) : 0.65;

  let effectiveFlightVolume = uniqueRetrieved;
  let volumeSource = 'retrieved_unique';

  if (liveData.totalReported != null && liveData.totalReported > uniqueRetrieved) {
    // When API returns a partial batch, scale the total reported schedule items
    // by the observed deduplication ratio to estimate full daily flight movements.
    effectiveFlightVolume = Math.round(liveData.totalReported * dedupeRatio);
    volumeSource = 'reported_schedule_scaled';
  }

  // Normalization against documented major commercial airport reference capacity (1,000 movements/day):
  // 1,000 daily movements corresponds to major international hub peak capacity (score 100).
  // 500 movements corresponds to moderate hub traffic (score 50).
  // 250 movements corresponds to regional hub traffic (score 25).
  const REFERENCE_CAPACITY = 1000;
  let activityScore = null;

  if (effectiveFlightVolume > 0) {
    const activityRatio = effectiveFlightVolume / REFERENCE_CAPACITY;
    activityScore = Math.min(100, Math.max(0, Math.round(activityRatio * 100)));
  }

  // --- 2. Delay Component (30% weight) ---
  const totalWithKnownDelay = liveData.totalWithKnownDelayStatus || 0;
  const totalDelayed = liveData.totalDelayed || 0;

  let delayScore = null;
  let delayRate = null;

  if (totalWithKnownDelay > 0) {
    delayRate = (totalDelayed / totalWithKnownDelay) * 100;
    // Delay rate normalization:
    // A 0% delay rate -> 0
    // A 20% delay rate (industry average for busy hubs) -> ~29
    // A 35% delay rate (notable congestion) -> 50
    // A 50% delay rate (heavy congestion) -> ~71
    // A 70%+ delay rate (critical gridlock) -> 100
    const SATURATION_DELAY_RATE = 70;
    delayScore = Math.min(100, Math.max(0, Math.round((delayRate / SATURATION_DELAY_RATE) * 100)));
  }

  // --- 3. Combined Score ---
  let combinedScore = null;
  let completeness = 'complete';

  if (activityScore != null && delayScore != null) {
    combinedScore = Math.round(ACTIVITY_WEIGHT * activityScore + DELAY_WEIGHT * delayScore);
    completeness = liveData.isPartial ? 'partial_sample' : 'complete';
  } else if (activityScore != null) {
    // Missing delay data — do NOT assume zero delay!
    combinedScore = activityScore;
    completeness = 'activity_only';
  } else if (delayScore != null) {
    combinedScore = delayScore;
    completeness = 'delay_only';
  } else {
    completeness = 'insufficient_data';
  }

  let category = 'Low';
  if (combinedScore == null) {
    category = 'Unavailable';
  } else if (combinedScore >= 85) {
    category = 'Very High';
  } else if (combinedScore >= 65) {
    category = 'High';
  } else if (combinedScore >= 40) {
    category = 'Moderate';
  }

  return {
    score: combinedScore != null ? Math.max(0, Math.min(100, combinedScore)) : null,
    category,
    activityScore,
    delayScore,
    delayRate,
    delayedFlights: totalDelayed,
    knownDelayFlights: totalWithKnownDelay,
    effectiveFlightVolume,
    volumeSource,
    weights: { activity: ACTIVITY_WEIGHT, delay: DELAY_WEIGHT },
    baseline: {
      type: 'commercial_hub_reference_1000',
      expectedDailyMovements: REFERENCE_CAPACITY,
      description: `Normalized against major commercial hub reference baseline (${REFERENCE_CAPACITY} daily movements)`,
    },
    isPartialData: Boolean(liveData.isPartial),
    dataCompleteness: completeness,
    description: 'Estimated flight-activity and delay congestion indicator based on available schedule data. Not an official measure of terminal crowding or passenger waiting times.',
  };
}