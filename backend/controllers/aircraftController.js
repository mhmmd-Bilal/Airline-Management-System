import AirCrafts from "../models/aircraftModel.js";

// ── @desc    Get all aircraft
// ── @route   GET /api/aircraft
// ── @access  Admin
export const getAllAircraft = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { registrationNumber: { $regex: search, $options: "i" } },
        { model:              { $regex: search, $options: "i" } },
      ];
    }

    const total    = await AirCrafts.countDocuments(query);
    const aircraft = await AirCrafts.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / limit),
      data:       aircraft,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ── @desc    Get single aircraft by ID
// ── @route   GET /api/aircraft/:id
// ── @access  Admin
export const getAircraftById = async (req, res) => {
  try {
    const aircraft = await AirCrafts.findById(req.params.id);

    if (!aircraft) {
      return res.status(404).json({ success: false, message: "Aircraft not found" });
    }

    res.status(200).json({ success: true, data: aircraft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @desc    Create new aircraft
// ── @route   POST /api/aircraft
// ── @access  Admin
export const createAircraft = async (req, res) => {
  try {
    const {
      model,
      registrationNumber,
      capacity,
      status,
      totalFlightHours,
      lastMaintenanceDate,
      nextMaintenanceDate,
    } = req.body;

    // required field check
    if (!model || !registrationNumber || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Model, registration number and capacity are required",
      });
    }

    // duplicate registration check
    const existing = await AirCrafts.findOne({ registrationNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Registration number ${registrationNumber} already exists`,
      });
    }

    const aircraft = await AirCrafts.create({
      model,
      registrationNumber,
      capacity,
      status:             status || "available",
      totalFlightHours:   totalFlightHours || 0,
      lastMaintenanceDate: lastMaintenanceDate || null,
      nextMaintenanceDate: nextMaintenanceDate || null,
    });

    res.status(201).json({ success: true, data: aircraft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @desc    Update aircraft
// ── @route   PUT /api/aircraft/:id
// ── @access  Admin
export const updateAircraft = async (req, res) => {
  try {
    const aircraft = await AirCrafts.findById(req.params.id);

    if (!aircraft) {
      return res.status(404).json({ success: false, message: "Aircraft not found" });
    }

    const {
      model,
      registrationNumber,
      capacity,
      status,
      totalFlightHours,
      lastMaintenanceDate,
      nextMaintenanceDate,
    } = req.body;

    // if reg number is changing, check no other aircraft has it
    if (
      registrationNumber &&
      registrationNumber !== aircraft.registrationNumber
    ) {
      const duplicate = await AirCrafts.findOne({ registrationNumber });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Registration number ${registrationNumber} already exists`,
        });
      }
    }

    aircraft.model               = model               ?? aircraft.model;
    aircraft.registrationNumber  = registrationNumber  ?? aircraft.registrationNumber;
    aircraft.capacity            = capacity            ?? aircraft.capacity;
    aircraft.status              = status              ?? aircraft.status;
    aircraft.totalFlightHours    = totalFlightHours    ?? aircraft.totalFlightHours;
    aircraft.lastMaintenanceDate = lastMaintenanceDate ?? aircraft.lastMaintenanceDate;
    aircraft.nextMaintenanceDate = nextMaintenanceDate ?? aircraft.nextMaintenanceDate;

    const updated = await aircraft.save();

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @desc    Delete aircraft
// ── @route   DELETE /api/aircraft/:id
// ── @access  Admin
export const deleteAircraft = async (req, res) => {
  try {
    const aircraft = await AirCrafts.findById(req.params.id);

    if (!aircraft) {
      return res.status(404).json({ success: false, message: "Aircraft not found" });
    }

    // prevent deleting an aircraft currently assigned to a flight
    if (aircraft.status === "assigned") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete an aircraft that is currently assigned to a flight",
      });
    }

    await aircraft.deleteOne();

    res.status(200).json({ success: true, message: "Aircraft deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @desc    Get fleet summary stats
// ── @route   GET /api/aircraft/stats
// ── @access  Admin
export const getAircraftStats = async (req, res) => {
  try {
    const [total, available, maintenance, assigned, grounded] = await Promise.all([
      AirCrafts.countDocuments(),
      AirCrafts.countDocuments({ status: "available" }),
      AirCrafts.countDocuments({ status: "maintenance" }),
      AirCrafts.countDocuments({ status: "assigned" }),
      AirCrafts.countDocuments({ status: "grounded" }),
    ]);

    res.status(200).json({
      success: true,
      data: { total, available, maintenance, assigned, grounded },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};