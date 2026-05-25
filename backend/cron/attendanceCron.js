import cron from "node-cron";

import Flights from "../models/flightsModel.js";
import Attendance from "../models/attendanceModel.js";
import Crew from "../models/crewModel.js";

cron.schedule("* * * * *", async () => {
  try {
    console.log("Running attendance auto-close cron...");

    const activeAttendances = await Attendance.find({
      $or: [{ clockOut: null }, { clockOut: { $exists: false } }],
      shiftEndsAt: { $lt: new Date() },
    });

    for (const attendance of activeAttendances) {
      const crew = await Crew.findOne({
        userId: attendance.staffId,
      });

      if (!crew) continue;

      const activeFlight = await Flights.findOne({
        crewIds: crew._id,
        status: {
          $in: ["boarding", "departed", "in-flight", "landing"],
        },
      });

      if (activeFlight) continue;

      attendance.clockOut = new Date();

      attendance.status = "missed-punchout";

      attendance.autoClosed = true;

      if (attendance.clockIn) {
        attendance.workingMinutes = Math.floor(
          (attendance.clockOut - attendance.clockIn) / 60000,
        );
      }

      await attendance.save();

      await Crew.findByIdAndUpdate(crew._id, {
        currentStatus: "Available",
      });

      console.log(`Attendance auto-closed for ${attendance.staffId}`);
    }
  } catch (error) {
    console.log("Attendance cron error:", error.message);
  }
});
