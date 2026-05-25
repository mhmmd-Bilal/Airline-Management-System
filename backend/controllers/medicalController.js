// controllers/medicalController.js
import MedicalRecords from "../models/medicalRecord.js";
import expressAsyncHandler from "express-async-handler";
import { createNotification } from "./notificationController.js";

// ── @desc   Create a medical incident report
// ── @route  POST /api/medical
// ── @access Crew / Admin
export const createMedicalRecord = expressAsyncHandler(async (req, res) => {
  const { userType, symptoms, diagnosis, treatment, flightId } = req.body;

  if (!symptoms?.trim() || !treatment?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Symptoms and treatment are required",
    });
  }

  const record = await MedicalRecords.create({
    userId: req.user._id,
    reportedBy: req.user._id,
    userType: userType || "passenger",
    symptoms: symptoms.trim(),
    diagnosis: diagnosis?.trim() || "",
    treatment: treatment.trim(),
    flightId: flightId || null,
    status: "open",
  });

  const populated = await MedicalRecords.findById(record._id).populate(
    "flightId",
    "flightNumber source destination departureTime",
  );

  await createNotification({
    roleTarget: "admin",
    title: "Medical Support Requested",
    message: `${req.user.name} requested medical support for flight ${populated.flightId?.flightNumber}.`,
    type: "medical",
    relatedId: populated._id,
    relatedModel: "medicalrecords",
    sentBy: req.user._id,
  });

  res.status(201).json({ success: true, data: populated });
});

// ── @desc   Get my medical incident reports (crew who filed them)
// ── @route  GET /api/medical/my
// ── @access Crew / Admin
export const getMyMedicalRecords = expressAsyncHandler(async (req, res) => {
  const { status, page = 1, limit = 8 } = req.query;

  const query = { reportedBy: req.user._id };
  if (status && status !== "all") query.status = status;

  const total = await MedicalRecords.countDocuments(query);
  const records = await MedicalRecords.find(query)
    .populate("flightId", "flightNumber source destination departureTime")
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: records,
  });
});

// ── @desc   Get all medical records (admin)
// ── @route  GET /api/medical
// ── @access Admin
export const getAllMedicalRecords = expressAsyncHandler(async (req, res) => {
  const { status, flightId, page = 1, limit = 15 } = req.query;

  const query = {};
  if (status && status !== "all") query.status = status;
  // if (userType && userType !== "all") query.userType = userType;
  if (flightId) query.flightId = flightId;

  const total = await MedicalRecords.countDocuments(query);
  const records = await MedicalRecords.find(query)
    .populate(
      "flightId",
      "flightNumber source destination departureTime status",
    )
    .populate("userId", "name email role")
    .populate("reportedBy", "name email role")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const [open, reviewed, resolved] = await Promise.all([
    MedicalRecords.countDocuments({ status: "open" }),
    MedicalRecords.countDocuments({ status: "reviewed" }),
    MedicalRecords.countDocuments({ status: "resolved" }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    stats: { open, reviewed, resolved },
    data: records,
  });
});

// ── @desc   Update record status (admin)
// ── @route  PATCH /api/medical/:id/status
// ── @access Admin
export const updateMedicalRecordStatus = expressAsyncHandler(
  async (req, res) => {
    const { adminMessage, status, attendedAt } = req.body;

    const valid = ["open", "reviewed", "resolved"];
    if (!valid.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const record = await MedicalRecords.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          adminMessage,
          ...(attendedAt ? { attendedAt: new Date(attendedAt) } : {}),
          ...(status === "resolved"
            ? { attendedAt: attendedAt || new Date() }
            : {}),
        },
      },
      { new: true },
    )
      .populate("flightId", "flightNumber source destination")
      .populate("reportedBy", "name email");

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    await createNotification({
      recipient: record?.userId,
      roleTarget: "passenger",
      title: "Medical Support Resolved",
      message: `The medical support request you submitted for flight ${record.flightId?.flightNumber} has been ${record.status}. Please contact support if further assistance is needed.`,
      type: "medical",
      relatedId: record._id,
      relatedModel: "medicalrecords",
      sentBy: req.user._id,
    });

    res.status(200).json({ success: true, data: record });
  },
);
