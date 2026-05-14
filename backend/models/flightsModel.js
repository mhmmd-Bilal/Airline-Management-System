import mongoose from "mongoose";

const flightSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String,
      required: true,
      unique: true,
    },
    source: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    routes: {
      type: [String],
      default: [],
    },
    currentStop: {
      type: String,
    },
    departureTime: {
      type: Date,
      required: true,
    },
    arrivalTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      default: "scheduled",
      enum: [
        "scheduled",
        "delayed",
        "boarding",
        "in-flight",
        "completed",
        "cancelled",
      ],
    },
    aircraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "aircrafts",
    },
    crewIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "crew",
      },
    ],
    totalSeats: {
      type: Number,
      required: true,
    },
    availableSeats: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Flights = mongoose.model("flights", flightSchema);

flightSchema.index({ status: 1, departureTime: 1, arrivalTime: 1 });
export default Flights;
