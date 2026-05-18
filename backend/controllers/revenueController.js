// controllers/revenueController.js
import expressAsyncHandler from "express-async-handler";
import Bookings from "../models/bookingModel.js";
import Loyalty from "../models/loyaltyModel.js";

/* ─────────────────────────────────────────────────────── */
/*  Helpers                                               */
/* ─────────────────────────────────────────────────────── */

const startOf = (year, month) => new Date(year, month, 1);

const endOf = (year, month) => new Date(year, month + 1, 0, 23, 59, 59, 999);

/** Resolve requested year — defaults to current year */
const resolveYear = (query) => {
  const y = parseInt(query?.year, 10);
  return isNaN(y) ? new Date().getFullYear() : y;
};

/* ─────────────────────────────────────────────────────── */
/*  Passenger Count Expression                            */
/* ─────────────────────────────────────────────────────── */

const passengerExpression = {
  $ifNull: [
    "$passengerCount",
    {
      $size: {
        $ifNull: ["$passengers", []],
      },
    },
  ],
};

/* ─────────────────────────────────────────────────────── */
/*  GET /api/revenue/overview                             */
/*  Full-year summary + monthly breakdown                 */
/* ─────────────────────────────────────────────────────── */

export const getRevenueOverview = expressAsyncHandler(async (req, res) => {
  const year = resolveYear(req.query);

  const yearStart = startOf(year, 0);
  const yearEnd = endOf(year, 11);

  /* ── 1. Monthly revenue (confirmed bookings only) ── */

  const monthlyRaw = await Bookings.aggregate([
    {
      $match: {
        status: { $in: ["confirmed", "completed"] },
        createdAt: { $gte: yearStart, $lte: yearEnd },
      },
    },

    {
      $group: {
        _id: { $month: "$createdAt" },

        revenue: {
          $sum: "$totalAmount",
        },

        bookingCount: {
          $sum: 1,
        },

        passengers: {
          $sum: passengerExpression,
        },
      },
    },

    {
      $sort: { _id: 1 },
    },
  ]);

  /* ── 2. Monthly refunds (cancelled bookings) ── */

  const refundRaw = await Bookings.aggregate([
    {
      $match: {
        status: "cancelled",
        createdAt: { $gte: yearStart, $lte: yearEnd },
      },
    },

    {
      $group: {
        _id: { $month: "$createdAt" },

        refunded: {
          $sum: "$totalAmount",
        },

        refundCount: {
          $sum: 1,
        },
      },
    },

    {
      $sort: { _id: 1 },
    },
  ]);

  /* ── 3. Build full 12-month arrays ── */

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;

    const rev = monthlyRaw.find((r) => r._id === m);

    const ref = refundRaw.find((r) => r._id === m);

    return {
      month: m,

      revenue: rev?.revenue ?? 0,

      bookingCount: rev?.bookingCount ?? 0,

      passengers: rev?.passengers ?? 0,

      refunded: ref?.refunded ?? 0,

      refundCount: ref?.refundCount ?? 0,

      net: (rev?.revenue ?? 0) - (ref?.refunded ?? 0),
    };
  });

  /* ── 4. Year totals ── */

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);

  const totalRefunds = monthly.reduce((s, m) => s + m.refunded, 0);

  const totalNet = monthly.reduce((s, m) => s + m.net, 0);

  const totalBookings = monthly.reduce((s, m) => s + m.bookingCount, 0);

  const totalPassengers = monthly.reduce((s, m) => s + m.passengers, 0);

  const totalRefundCount = monthly.reduce((s, m) => s + m.refundCount, 0);

  const bestMonth = monthly.reduce(
    (best, m) => (m.revenue > best.revenue ? m : best),
    monthly[0],
  );

  const avgMonthly = totalRevenue / 12;

  /* ── 5. YoY growth vs previous year ── */

  const prevYearStart = startOf(year - 1, 0);

  const prevYearEnd = endOf(year - 1, 11);

  const [prevYearAgg] = await Bookings.aggregate([
    {
      $match: {
        status: { $in: ["confirmed", "completed"] },
        createdAt: {
          $gte: prevYearStart,
          $lte: prevYearEnd,
        },
      },
    },

    {
      $group: {
        _id: null,

        total: {
          $sum: "$totalAmount",
        },
      },
    },
  ]);

  const prevTotal = prevYearAgg?.total ?? 0;

  const yoyGrowth =
    prevTotal > 0
      ? (((totalRevenue - prevTotal) / prevTotal) * 100).toFixed(1)
      : null;

  res.status(200).json({
    success: true,

    year,

    summary: {
      totalRevenue,

      totalRefunds,

      totalNet,

      totalBookings,

      totalPassengers,

      totalRefundCount,

      avgMonthly,

      bestMonth: {
        month: bestMonth.month,
        revenue: bestMonth.revenue,
      },

      yoyGrowth: yoyGrowth !== null ? Number(yoyGrowth) : null,

      prevYearRevenue: prevTotal,
    },

    monthly,
  });
});

/* ─────────────────────────────────────────────────────── */
/*  GET /api/revenue/breakdown                            */
/*  Revenue split by booking status + top routes          */
/* ─────────────────────────────────────────────────────── */

export const getRevenueBreakdown = expressAsyncHandler(async (req, res) => {
  const year = resolveYear(req.query);

  const yearStart = startOf(year, 0);

  const yearEnd = endOf(year, 11);

  const baseMatch = {
    createdAt: {
      $gte: yearStart,
      $lte: yearEnd,
    },
  };

  /* ── By status ── */

  const byStatus = await Bookings.aggregate([
    {
      $match: baseMatch,
    },

    {
      $group: {
        _id: "$status",

        total: {
          $sum: "$totalAmount",
        },

        count: {
          $sum: 1,
        },

        passengers: {
          $sum: passengerExpression,
        },
      },
    },

    {
      $sort: { total: -1 },
    },
  ]);

  /* ── By seat class ── */

  const bySeatClass = await Bookings.aggregate([
    {
      $match: {
        ...baseMatch,
        status: { $in: ["confirmed", "completed"] },
      },
    },

    {
      $group: {
        _id: "$seatClass",

        total: {
          $sum: "$totalAmount",
        },

        count: {
          $sum: 1,
        },

        passengers: {
          $sum: passengerExpression,
        },
      },
    },

    {
      $sort: { total: -1 },
    },
  ]);

  /* ── Top 5 routes by revenue ── */

  const topRoutes = await Bookings.aggregate([
    {
      $match: {
        ...baseMatch,
        status: { $in: ["confirmed", "completed"] },
      },
    },

    {
      $lookup: {
        from: "flights",
        localField: "flightId",
        foreignField: "_id",
        as: "flight",
      },
    },

    {
      $unwind: {
        path: "$flight",
        preserveNullAndEmptyArrays: false,
      },
    },

    {
      $group: {
        _id: {
          source: "$flight.source",
          destination: "$flight.destination",
        },

        revenue: {
          $sum: "$totalAmount",
        },

        count: {
          $sum: 1,
        },

        passengers: {
          $sum: passengerExpression,
        },
      },
    },

    {
      $sort: { revenue: -1 },
    },

    {
      $limit: 5,
    },

    {
      $project: {
        _id: 0,

        source: "$_id.source",

        destination: "$_id.destination",

        revenue: 1,

        count: 1,

        passengers: 1,
      },
    },
  ]);

  /* ── Daily breakdown for current month ── */

  const now = new Date();

  const monthStart = startOf(now.getFullYear(), now.getMonth());

  const monthEnd = endOf(now.getFullYear(), now.getMonth());

  const dailyRaw = await Bookings.aggregate([
    {
      $match: {
        status: { $in: ["confirmed", "completed"] },
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      },
    },

    {
      $group: {
        _id: {
          $dayOfMonth: "$createdAt",
        },

        revenue: {
          $sum: "$totalAmount",
        },

        count: {
          $sum: 1,
        },

        passengers: {
          $sum: passengerExpression,
        },
      },
    },

    {
      $sort: { _id: 1 },
    },
  ]);

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const d = dailyRaw.find((r) => r._id === i + 1);

    return {
      day: i + 1,

      revenue: d?.revenue ?? 0,

      count: d?.count ?? 0,

      passengers: d?.passengers ?? 0,
    };
  });

  res.status(200).json({
    success: true,

    year,

    byStatus,

    bySeatClass,

    topRoutes,

    daily,
  });
});

/* ─────────────────────────────────────────────────────── */
/*  GET /api/revenue/stats                                */
/*  Quick KPI cards for the dashboard                     */
/* ─────────────────────────────────────────────────────── */

export const getRevenueStats = expressAsyncHandler(async (req, res) => {
  const now = new Date();

  const thisMonth = {
    $gte: startOf(now.getFullYear(), now.getMonth()),
    $lte: endOf(now.getFullYear(), now.getMonth()),
  };

  const lastMonthS = startOf(now.getFullYear(), now.getMonth() - 1);

  const lastMonthE = endOf(now.getFullYear(), now.getMonth() - 1);

  const lastMonth = {
    $gte: lastMonthS,
    $lte: lastMonthE,
  };

  const todayS = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayE = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  const today = {
    $gte: todayS,
    $lte: todayE,
  };

  const [thisMonthAgg, lastMonthAgg, todayAgg, pendingAgg] = await Promise.all([
    Bookings.aggregate([
      {
        $match: {
          status: {
            $in: ["confirmed", "completed"],
          },
          createdAt: thisMonth,
        },
      },

      {
        $group: {
          _id: null,

          revenue: {
            $sum: "$totalAmount",
          },

          count: {
            $sum: 1,
          },

          passengers: {
            $sum: passengerExpression,
          },
        },
      },
    ]),

    Bookings.aggregate([
      {
        $match: {
          status: {
            $in: ["confirmed", "completed"],
          },
          createdAt: lastMonth,
        },
      },

      {
        $group: {
          _id: null,

          revenue: {
            $sum: "$totalAmount",
          },

          count: {
            $sum: 1,
          },

          passengers: {
            $sum: passengerExpression,
          },
        },
      },
    ]),

    Bookings.aggregate([
      {
        $match: {
          status: {
            $in: ["confirmed", "completed"],
          },
          createdAt: today,
        },
      },

      {
        $group: {
          _id: null,

          revenue: {
            $sum: "$totalAmount",
          },

          count: {
            $sum: 1,
          },

          passengers: {
            $sum: passengerExpression,
          },
        },
      },
    ]),

    Bookings.aggregate([
      {
        $match: {
          status: "pending",
        },
      },

      {
        $group: {
          _id: null,

          revenue: {
            $sum: "$totalAmount",
          },

          count: {
            $sum: 1,
          },

          passengers: {
            $sum: passengerExpression,
          },
        },
      },
    ]),
  ]);

  const thisM = thisMonthAgg[0] ?? {
    revenue: 0,
    count: 0,
    passengers: 0,
  };

  const lastM = lastMonthAgg[0] ?? {
    revenue: 0,
    count: 0,
    passengers: 0,
  };

  const tod = todayAgg[0] ?? {
    revenue: 0,
    count: 0,
    passengers: 0,
  };

  const pend = pendingAgg[0] ?? {
    revenue: 0,
    count: 0,
    passengers: 0,
  };

  const momGrowth =
    lastM.revenue > 0
      ? Number(
          (((thisM.revenue - lastM.revenue) / lastM.revenue) * 100).toFixed(1),
        )
      : null;

  res.status(200).json({
    success: true,

    stats: {
      today: {
        revenue: tod.revenue,
        count: tod.count,
        passengers: tod.passengers,
      },

      thisMonth: {
        revenue: thisM.revenue,
        count: thisM.count,
        passengers: thisM.passengers,
      },

      lastMonth: {
        revenue: lastM.revenue,
        count: lastM.count,
        passengers: lastM.passengers,
      },

      pending: {
        revenue: pend.revenue,
        count: pend.count,
        passengers: pend.passengers,
      },

      momGrowth,
    },
  });
});
