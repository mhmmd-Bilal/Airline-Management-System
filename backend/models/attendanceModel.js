import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    clockIn: {
      type: Date,
    },
    clockOut: {
      type: Date,
    },
    status: {
      type: String,
      default: "present",
      enum: ["present", "absent", "leave", "half-day"],
    },
    biometricVerified: {
      type: Boolean,
      default: false,
    },
    // flightId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "flights",
    // },
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model("attendance", attendanceSchema);
export default Attendance;