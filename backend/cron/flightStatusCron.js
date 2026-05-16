// cron/flightStatusCron.js
import cron from "node-cron";
import Flights from "../models/flightsModel.js";

const BOARDING_WINDOW_MINUTES = 30;
const MISSED_CANCEL_HOURS     = 3;
const CRON_SCHEDULE           = "* * * * *";

const log = {
  info:  (msg) => console.log(`[FlightCron] ℹ️  ${new Date().toISOString()} | ${msg}`),
  ok:    (msg) => console.log(`[FlightCron] ✅ ${new Date().toISOString()} | ${msg}`),
  warn:  (msg) => console.warn(`[FlightCron] ⚠️  ${new Date().toISOString()} | ${msg}`),
  error: (msg) => console.error(`[FlightCron] ❌ ${new Date().toISOString()} | ${msg}`),
};

async function transition({ label, filter, update }) {
  const result = await Flights.updateMany(filter, { $set: update });
  if (result.modifiedCount > 0) {
    log.ok(`${label}: ${result.modifiedCount} flight(s) updated`);
  }
  return result;
}

// ── in-flight → completed ──────────────────────────────
async function completeArrivedFlights(now) {
  const candidates = await Flights.find({
    status:      "in-flight",
    arrivalTime: { $lte: now },
  }).select("_id routes currentStop");

  const toComplete = [];

  for (const f of candidates) {
    const lastStop = f.routes?.length > 0
      ? f.routes[f.routes.length - 1]
      : null;

    if (!lastStop) {
      // no stops defined — trust arrivalTime
      toComplete.push(f._id);
      continue;
    }

    if (f.currentStop && f.currentStop === lastStop) {
      // currentStop explicitly set to final destination
      toComplete.push(f._id);
      continue;
    }

    if (!f.currentStop) {
      // no currentStop set at all — trust arrivalTime
      toComplete.push(f._id);
      continue;
    }

    // currentStop is a mid-stop — DO NOT complete yet
    log.info(
      `Flight ${f._id} skipped completion — at mid-stop "${f.currentStop}", final is "${lastStop}"`
    );
  }

  if (!toComplete.length) return { modifiedCount: 0 };

  const result = await Flights.updateMany(
    { _id: { $in: toComplete } },
    {
      $set: {
        status:            "completed",
        actualArrivalTime: now,       // ← exact time cron marked it complete
      },
    }
  );

  if (result.modifiedCount > 0) {
    log.ok(`in-flight → completed: ${result.modifiedCount} flight(s) updated`);
  }

  return result;
}

// ── catch-all: missed flights past arrivalTime ─────────
async function completeMissedFlights(now) {
  const candidates = await Flights.find({
    status:      { $in: ["scheduled", "boarding", "delayed"] },
    arrivalTime: { $lte: now },
  }).select("_id routes currentStop");

  const toComplete = candidates
    .filter((f) => {
      const lastStop = f.routes?.length > 0 ? f.routes[f.routes.length - 1] : null;
      if (!lastStop)      return true;
      if (!f.currentStop) return true;
      return f.currentStop === lastStop;
    })
    .map((f) => f._id);

  if (!toComplete.length) return { modifiedCount: 0 };

  const result = await Flights.updateMany(
    { _id: { $in: toComplete } },
    {
      $set: {
        status:            "completed",
        actualArrivalTime: now,       // ← exact time cron marked it complete
      },
    }
  );

  if (result.modifiedCount > 0) {
    log.ok(`missed → completed (catch-all): ${result.modifiedCount} flight(s) updated`);
  }

  return result;
}

async function runFlightStatusEngine() {
  const now            = new Date();
  const boardingCutoff = new Date(now.getTime() + BOARDING_WINDOW_MINUTES * 60 * 1000);
  const missedCutoff   = new Date(now.getTime() - MISSED_CANCEL_HOURS * 60 * 60 * 1000);

  const results = await Promise.allSettled([

    // 1. scheduled → boarding
    transition({
      label:  "scheduled → boarding",
      filter: {
        status:        "scheduled",
        departureTime: { $lte: boardingCutoff, $gt: now },
      },
      update: { status: "boarding" },
    }),

    // 2. boarding/scheduled/delayed → in-flight
    transition({
      label:  "boarding/scheduled/delayed → in-flight",
      filter: {
        status:        { $in: ["scheduled", "boarding", "delayed"] },
        departureTime: { $lte: now },
        arrivalTime:   { $gt: now },
      },
      update: { status: "in-flight" },
    }),

    // 3. in-flight → completed (stop-aware + sets actualArrivalTime)
    completeArrivedFlights(now),

    // 4. catch-all missed flights (stop-aware + sets actualArrivalTime)
    completeMissedFlights(now),

    // 5. stuck on ground → cancelled
    transition({
      label:  "stuck on ground → cancelled",
      filter: {
        status:        { $in: ["scheduled", "boarding"] },
        departureTime: { $lte: missedCutoff },
        arrivalTime:   { $gt: now },
      },
      update: { status: "cancelled" },
    }),

  ]);

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      log.error(`Transition ${i + 1} failed: ${r.reason?.message}`);
    }
  });

  return results;
}

async function logSnapshot() {
  if (process.env.NODE_ENV === "production") return;

  const active = await Flights.find(
    { status: { $nin: ["completed", "cancelled"] } },
    {
      flightNumber: 1, status: 1,
      departureTime: 1, arrivalTime: 1,
      actualArrivalTime: 1,
      currentStop: 1, routes: 1,
      _id: 0,
    }
  ).lean();

  if (!active.length) {
    log.info("No active flights in DB");
    return;
  }

  const now  = new Date();
  const rows = active.map((f) => {
    const depDiff  = Math.round((new Date(f.departureTime) - now) / 60000);
    const arrDiff  = Math.round((new Date(f.arrivalTime)   - now) / 60000);
    const depStr   = depDiff >= 0 ? `in ${depDiff}m`         : `${Math.abs(depDiff)}m ago`;
    const arrStr   = arrDiff >= 0 ? `in ${arrDiff}m`         : `${Math.abs(arrDiff)}m ago`;
    const lastStop = f.routes?.length > 0 ? f.routes[f.routes.length - 1] : "—";
    const stopInfo = f.currentStop
      ? `stop: ${f.currentStop} (final: ${lastStop})`
      : `no stop set (final: ${lastStop})`;
    const actualArr = f.actualArrivalTime
      ? `actual: ${new Date(f.actualArrivalTime).toISOString()}`
      : "";
    return `  ${f.flightNumber.padEnd(12)} | ${f.status.padEnd(10)} | dep: ${depStr.padStart(10)} | arr: ${arrStr.padStart(10)} | ${stopInfo}${actualArr ? ` | ${actualArr}` : ""}`;
  });

  log.info(`Active flights (${active.length}):\n${rows.join("\n")}`);
}

let isRunning = false;

export const startFlightStatusCron = () => {
  cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      log.warn("Previous run still in progress — skipping this tick");
      return;
    }

    isRunning = true;
    const start = Date.now();

    try {
      await runFlightStatusEngine();
      await logSnapshot();

      const elapsed = Date.now() - start;
      if (elapsed > 5000) {
        log.warn(`Run took ${elapsed}ms — consider optimising DB indexes`);
      }
    } catch (error) {
      log.error(`Unhandled error in status engine: ${error.message}`);
    } finally {
      isRunning = false;
    }
  });

  log.ok(
    `Flight status cron started | schedule: "${CRON_SCHEDULE}" | boarding window: ${BOARDING_WINDOW_MINUTES}min | missed cancel: ${MISSED_CANCEL_HOURS}hrs`
  );
};