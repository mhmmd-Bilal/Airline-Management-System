import mongoose from "mongoose";

const crewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["Pilot", "Co-Pilot", "Cabin Crew", "Ground Staff"],
      required: true,
    },
    experience: {
      type: Number,
      default: 0,
    },
    licenseNumber: {
      type: String,
    },
    licenseExpiry: {
      type: Date,
    },
    nationality: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    currentStatus: {
      type: String,
      enum: ["Available", "On Duty", "Off Duty", "On Leave"],
      default: "Available",
    },
    salary: {
      type: Number,
    },
    medicalStatus: {
      type: String,
      enum: ["Fit", "Under Treatment"],
      default: "Fit",
    },
    medicalLastChecked: {
      type: Date,
    },
    medicalNextDue: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Crews = mongoose.model("crew", crewSchema);
export default Crews;