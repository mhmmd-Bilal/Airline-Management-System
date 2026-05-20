// slices/refundApiSlice.js
import { apiSlice } from "./apiSlice";

const REFUND_URL = "/api/refunds";

const refundApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Passenger — request a refund after cancellation
    requestRefund: builder.mutation({
      query: ({ bookingId, reason }) => ({
        url: REFUND_URL,
        method: "POST",
        body: { bookingId, reason },
      }),
      invalidatesTags: ["Refund", "Booking"],
    }),

    // Passenger — their own refund history
    getMyRefunds: builder.query({
      query: () => ({ url: `${REFUND_URL}/my` }),
      providesTags: ["Refund"],
    }),

    // Admin — stats cards
    getRefundStats: builder.query({
      query: () => ({ url: `${REFUND_URL}/stats` }),
      providesTags: ["Refund"],
    }),

    // Admin — paginated list with optional status filter
    getAllRefunds: builder.query({
      query: ({ status = "all", page = 1, limit = 15 } = {}) => ({
        url: REFUND_URL,
        params: { status, page, limit },
      }),
      providesTags: ["Refund"],
    }),

    // Admin — approve or reject
    processRefund: builder.mutation({
      query: ({ id, action, note }) => ({
        url: `${REFUND_URL}/${id}`,
        method: "PATCH",
        body: { action, note },
      }),
      invalidatesTags: ["Refund", "Booking"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useRequestRefundMutation,
  useGetMyRefundsQuery,
  useGetRefundStatsQuery,
  useGetAllRefundsQuery,
  useProcessRefundMutation,
} = refundApiSlice;
