import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    userType: {
      type: String,
      enum: ["passenger", "crew"],
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "flights",
    },
    symptoms: {
      type: String,
    },
    diagnosis: {
      type: String,
    },
    treatment: {
      type: String,
    },
    status: {
      type: String,
      default: "open",
      enum: ["open", "reviewed", "resolved"],
    },
    adminMessage : {
      type : String
    },
    attendedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const MedicalRecords = mongoose.model("medicalrecords", medicalRecordSchema);
export default MedicalRecords;