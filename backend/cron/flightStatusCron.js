// cron/flightStatusCron.js
import cron from "node-cron";
import Flights from "../models/flightsModel.js";
import Attendance from "../models/attendanceModel.js";
import Crew from "../models/crewModel.js";
import Bookings from "../models/flightsModel.js";

const BOARDING_WINDOW_MINUTES = 30;
const MISSED_CANCEL_HOURS = 3;
const CRON_SCHEDULE = "* * * * *";

const log = {
  info: (msg) =>
    console.log(`[FlightCron] ℹ️  ${new Date().toISOString()} | ${msg}`),
  ok: (msg) =>
    console.log(`[FlightCron] ✅ ${new Date().toISOString()} | ${msg}`),
  warn: (msg) =>
    console.warn(`[FlightCron] ⚠️  ${new Date().toISOString()} | ${msg}`),
  error: (msg) =>
    console.error(`[FlightCron] ❌ ${new Date().toISOString()} | ${msg}`),
};

/* ─────────────────────────────────────────────────────── */
/*  Core completion logic                                 */
/*                                                        */
/*  Rule (exactly as specified):                         */
/*  IF now >= arrivalTime                                 */
/*    → status            = "completed"                  */
/*    → actualArrivalTime = now                          */
/*    → currentStop       = last element of routes[]     */
/*                          OR destination if routes=[]  */
/* ─────────────────────────────────────────────────────── */

async function completeFlights(now) {
  // Fetch every flight whose arrivalTime has been reached
  // and is not already completed or cancelled
  const flights = await Flights.find({
    status: { $nin: ["completed", "cancelled"] },
    arrivalTime: { $lte: now },
  })
    .select("_id routes destination currentStop status")
    .lean();

  if (!flights.length) return 0;

  // For each flight, resolve what currentStop should be after completion:
  //   - last element of routes[] if routes has items
  //   - flight.destination as fallback
  //   - flight.currentStop as last resort (keep whatever it was)
  const bulkOps = flights.map((f) => {
    const routes = Array.isArray(f.routes) ? f.routes : [];
    const finalStop =
      routes.length > 0
        ? routes[routes.length - 1] // ← last stop in routes array
        : (f.destination ?? f.currentStop ?? null);

    const setFields = {
      status: "completed",
      actualArrivalTime: now,
    };

    // Only set currentStop if we resolved a value
    if (finalStop) {
      setFields.currentStop = finalStop;
    }

    return {
      updateOne: {
        filter: { _id: f._id },
        update: { $set: setFields },
      },
    };
  });

  const result = await Flights.bulkWrite(bulkOps, { ordered: false });

  await Promise.all(
    flights.map((f) =>
      Bookings.updateMany(
        {
          flightId: f._id,
          status: { $ne: "cancelled" },
        },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
          },
        },
      ),
    ),
  );

  if (result.modifiedCount > 0) {
    log.ok(
      `→ completed: ${result.modifiedCount} flight(s) | ` +
        `actualArrivalTime: ${now.toISOString()} | ` +
        `currentStop: set to final route stop`,
    );

    // Log each one for visibility
    flights.forEach((f) => {
      const routes = Array.isArray(f.routes) ? f.routes : [];
      const finalStop =
        routes.length > 0
          ? routes[routes.length - 1]
          : (f.destination ?? f.currentStop ?? "—");
      log.info(
        `  flight ${f._id} | was: ${f.status} | ` +
          `routes: [${routes.join(", ")}] | ` +
          `currentStop → "${finalStop}"`,
      );
    });
  }

  return result.modifiedCount;
}

/* ─────────────────────────────────────────────────────── */
/*  Simple transition helper (no per-flight logic needed) */
/* ─────────────────────────────────────────────────────── */

async function transition({ label, filter, update }) {
  const result = await Flights.updateMany(filter, { $set: update });
  if (result.modifiedCount > 0) {
    log.ok(`${label}: ${result.modifiedCount} flight(s) updated`);
  }
  return result;
}

async function autoCloseCrewAttendance(now) {
  // Find all active attendances
  const attendances = await Attendance.find({
    clockOut: null,
  }).populate("staffId");

  if (!attendances.length) return 0;

  let closedCount = 0;

  for (const attendance of attendances) {
    // Check if crew has active flights
    const activeFlight = await Flights.findOne({
      crewIds: attendance.staffId._id,
      status: {
        $in: ["boarding", "taxi-out", "departed", "in-flight", "landing"],
      },
    });

    // Still working on flight
    if (activeFlight) continue;

    // Shift not ended yet
    if (attendance.shiftEndsAt && attendance.shiftEndsAt > now) {
      continue;
    }

    // Auto clock out
    attendance.clockOut = now;

    attendance.autoClosed = true;

    attendance.workingMinutes = Math.floor(
      (attendance.clockOut - attendance.clockIn) / 60000,
    );

    await attendance.save();

    // Update crew availability
    await Crew.findByIdAndUpdate(attendance.staffId._id, {
      currentStatus: "available",
    });

    closedCount++;
  }

  if (closedCount > 0) {
    log.ok(`Auto-closed ${closedCount} attendance record(s)`);
  }

  return closedCount;
}

/* ─────────────────────────────────────────────────────── */
/*  Main engine                                           */
/* ─────────────────────────────────────────────────────── */

async function runFlightStatusEngine() {
  const now = new Date();
  const boardingCutoff = new Date(
    now.getTime() + BOARDING_WINDOW_MINUTES * 60 * 1000,
  );
  const missedCutoff = new Date(
    now.getTime() - MISSED_CANCEL_HOURS * 60 * 60 * 1000,
  );

  // Run all transitions in parallel
  const results = await Promise.allSettled([
    // 1. scheduled → boarding
    //    Flight is within the boarding window but hasn't departed yet
    transition({
      label: "scheduled → boarding",
      filter: {
        status: "scheduled",
        departureTime: { $lte: boardingCutoff, $gt: now },
      },
      update: { status: "boarding" },
    }),

    // 2. any active status → in-flight
    //    Flight has departed but arrival hasn't been reached yet
    transition({
      label: "→ in-flight",
      filter: {
        status: { $in: ["scheduled", "boarding", "delayed"] },
        departureTime: { $lte: now },
        arrivalTime: { $gt: now },
      },
      update: { status: "in-flight" },
    }),

    // 3. ANY non-terminal status → completed
    //    arrivalTime has been reached — complete it unconditionally,
    //    set actualArrivalTime = now, set currentStop = last route stop
    completeFlights(now),

    // 4. Still on ground way past departure → cancelled
    //    Scheduled or boarding but departureTime was >MISSED_CANCEL_HOURS ago
    //    and arrivalTime is still in the future (never actually took off)
    transition({
      label: "stuck on ground → cancelled",
      filter: {
        status: { $in: ["scheduled", "boarding"] },
        departureTime: { $lte: missedCutoff },
        arrivalTime: { $gt: now },
      },
      update: { status: "cancelled" },
    }),

    autoCloseCrewAttendance(now),
  ]);

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      log.error(
        `Transition ${i + 1} failed: ${r.reason?.message ?? String(r.reason)}`,
      );
    }
  });
}

/* ─────────────────────────────────────────────────────── */
/*  Dev snapshot                                          */
/* ─────────────────────────────────────────────────────── */

async function logSnapshot() {
  if (process.env.NODE_ENV === "production") return;

  const active = await Flights.find(
    { status: { $nin: ["completed", "cancelled"] } },
    {
      flightNumber: 1,
      status: 1,
      departureTime: 1,
      arrivalTime: 1,
      currentStop: 1,
      routes: 1,
      destination: 1,
      _id: 0,
    },
  ).lean();

  if (!active.length) {
    log.info("No active flights");
    return;
  }

  const now = new Date();

  const rows = active.map((f) => {
    const dep = Math.round((new Date(f.departureTime) - now) / 60000);
    const arr = Math.round((new Date(f.arrivalTime) - now) / 60000);
    const depStr = dep >= 0 ? `in ${dep}m` : `${Math.abs(dep)}m ago`;
    const arrStr = arr >= 0 ? `in ${arr}m` : `${Math.abs(arr)}m ago`;
    const routes = Array.isArray(f.routes) ? f.routes : [];
    const finalSt =
      routes.length > 0 ? routes[routes.length - 1] : (f.destination ?? "—");
    const stopStr = `curr:${f.currentStop ?? "—"}  final:${finalSt}`;

    return (
      `  ${f.flightNumber.padEnd(14)}` +
      `${f.status.padEnd(12)}` +
      `dep:${depStr.padEnd(12)}` +
      `arr:${arrStr.padEnd(12)}` +
      `${stopStr}`
    );
  });

  log.info(`Active (${active.length}):\n${rows.join("\n")}`);
}

/* ─────────────────────────────────────────────────────── */
/*  Guard + scheduler                                     */
/* ─────────────────────────────────────────────────────── */

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
        log.warn(`Slow run: ${elapsed}ms`);
      }
    } catch (err) {
      log.error(`Unhandled error: ${err.message}`);
    } finally {
      isRunning = false;
    }
  });

  log.ok(
    `Cron started | schedule: "${CRON_SCHEDULE}" | ` +
      `boarding: ${BOARDING_WINDOW_MINUTES}min | ` +
      `cancel after: ${MISSED_CANCEL_HOURS}hrs on ground`,
  );
};
