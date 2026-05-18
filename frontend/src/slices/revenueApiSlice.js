// slices/revenueApiSlice.js
import { apiSlice } from "./apiSlice";

const REVENUE_URL = "/api/revenue";

const revenueApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // Full year overview + monthly chart data
    getRevenueOverview: builder.query({
      query: ({ year } = {}) => ({
        url:    `${REVENUE_URL}/overview`,
        params: year ? { year } : {},
      }),
      providesTags: ["Revenue"],
    }),

    // Breakdown — by status, seat class, top routes, daily
    getRevenueBreakdown: builder.query({
      query: ({ year } = {}) => ({
        url:    `${REVENUE_URL}/breakdown`,
        params: year ? { year } : {},
      }),
      providesTags: ["Revenue"],
    }),

    // Quick KPI stats for dashboard cards
    getRevenueStats: builder.query({
      query: () => ({ url: `${REVENUE_URL}/stats` }),
      providesTags: ["Revenue"],
    }),

  }),
});

export const {
  useGetRevenueOverviewQuery,
  useGetRevenueBreakdownQuery,
  useGetRevenueStatsQuery,
} = revenueApiSlice;