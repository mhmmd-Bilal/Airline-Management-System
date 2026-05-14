// slices/attendanceApiSlice.js
import { apiSlice } from "./apiSlice";

const ATTENDANCE_URL = "/api/attendance";

// slices/attendanceApiSlice.js — add the new query
const attendanceApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    getTodayAttendance: builder.query({
      query: () => ({ url: `${ATTENDANCE_URL}/today` }),
      providesTags: ["Attendance"],
    }),

    getMyAttendance: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url:    `${ATTENDANCE_URL}/my`,
        params: { page, limit },
      }),
      providesTags: ["Attendance"],
    }),

    // ── new ──
    getMyAttendanceByMonth: builder.query({
      query: ({ year, month } = {}) => ({
        url:    `${ATTENDANCE_URL}/my/month`,
        params: { year, month },
      }),
      providesTags: ["Attendance"],
    }),

    punchIn: builder.mutation({
      query: (data = {}) => ({
        url:    `${ATTENDANCE_URL}/punch-in`,
        method: "POST",
        body:   data,
      }),
      invalidatesTags: ["Attendance"],
    }),

    punchOut: builder.mutation({
      query: () => ({
        url:    `${ATTENDANCE_URL}/punch-out`,
        method: "PATCH",
      }),
      invalidatesTags: ["Attendance"],
    }),

    getAllAttendance: builder.query({
      query: ({ staffId, date, status, page = 1, limit = 20 } = {}) => ({
        url:    ATTENDANCE_URL,
        params: { staffId, date, status, page, limit },
      }),
      providesTags: ["Attendance"],
    }),

  }),
});

export const {
  useGetTodayAttendanceQuery,
  useGetMyAttendanceQuery,
  useGetMyAttendanceByMonthQuery,   // ← new
  usePunchInMutation,
  usePunchOutMutation,
  useGetAllAttendanceQuery,
} = attendanceApiSlice;