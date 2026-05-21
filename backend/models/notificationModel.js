import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },

    roleTarget: {
      type: String,
      enum: ["all", "passenger", "crew", "admin"],
      default: "all",
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "booking",
        "flight",
        "payment",
        "refund",
        "support",
        "loyalty",
        "system",
        "medical",
      ],
      default: "system",
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    relatedModel: {
      type: String,
      enum: [
        "bookings",
        "flights",
        "refunds",
        "supporttickets",
        "loyalty",
        "medicalrecords",
      ],
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ roleTarget: 1 });

const Notifications = mongoose.model("notifications", notificationSchema);

export default Notifications;
