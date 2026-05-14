import mongoose from "mongoose";

const airCraftSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "available",
      enum: ["available", "maintenance", "assigned", "grounded"],
    },
    totalFlightHours: {
      type: Number,
      default: 0,
    },
    lastMaintenanceDate: {
      type: Date,
    },
    nextMaintenanceDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const AirCrafts = mongoose.model("aircrafts", airCraftSchema);
export default AirCrafts;