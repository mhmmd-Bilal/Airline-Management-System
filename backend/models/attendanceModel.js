import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // attendance day
    date: {
      type: Date,
      required: true,
    },

    // punch timings
    clockIn: {
      type: Date,
      default: null,
    },

    clockOut: {
      type: Date,
      default: null,
    },

    // planned shift end
    shiftEndsAt: {
      type: Date,
      default: null,
    },

    // attendance state
    status: {
      type: String,
      default: "present",
      enum: [
        "present",
        "completed",
        "absent",
        "leave",
        "half-day",
        "missed-punchout",
        "on-flight",
      ],
    },

    // working calculations
    workingMinutes: {
      type: Number,
      default: 0,
    },

    overtimeMinutes: {
      type: Number,
      default: 0,
    },

    // system auto close
    autoClosed: {
      type: Boolean,
      default: false,
    },

    // biometric verification
    biometricVerified: {
      type: Boolean,
      default: false,
    },

    // optional flight linkage
    activeFlightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "flights",
      default: null,
    },

    // optional remarks
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

/* -------------------------------------------------------------------------- */
/*                                   Indexes                                  */
/* -------------------------------------------------------------------------- */

attendanceSchema.index({
  staffId: 1,
  date: 1,
});

attendanceSchema.index({
  status: 1,
});

attendanceSchema.index({
  activeFlightId: 1,
});

/* -------------------------------------------------------------------------- */
/*                              Pre-save Hook                                 */
/* -------------------------------------------------------------------------- */

attendanceSchema.pre("save", async function () {
  // auto calculate working minutes
  if (this.clockIn && this.clockOut) {
    const totalMinutes = (this.clockOut - this.clockIn) / 60000;

    this.workingMinutes = Math.max(Math.floor(totalMinutes), 0);

    // overtime after 8 hrs
    if (this.workingMinutes > 480) {
      this.overtimeMinutes = this.workingMinutes - 480;
    }
  }


});

const Attendance = mongoose.model("attendance", attendanceSchema);

export default Attendance;
