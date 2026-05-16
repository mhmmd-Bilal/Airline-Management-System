// slices/loyaltyApiSlice.js
import { apiSlice } from "./apiSlice";

const LOYALTY_URL = "/api/loyalty";

const loyaltyApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // GET /api/loyalty/me
    getMyLoyalty: builder.query({
      query: () => ({ url: `${LOYALTY_URL}/me` }),
      providesTags: ["Loyalty"],
    }),

    // POST /api/loyalty/earn
    earnPoints: builder.mutation({
      query: (data) => ({
        url:    `${LOYALTY_URL}/earn`,
        method: "POST",
        body:   data,
      }),
      invalidatesTags: ["Loyalty"],
    }),

    // POST /api/loyalty/redeem
    redeemPoints: builder.mutation({
      query: (data) => ({
        url:    `${LOYALTY_URL}/redeem`,
        method: "POST",
        body:   data,
      }),
      invalidatesTags: ["Loyalty"],
    }),

    // admin
    getAllLoyalty: builder.query({
      query: ({ page = 1, limit = 20, tier = "all" } = {}) => ({
        url:    LOYALTY_URL,
        params: { page, limit, tier },
      }),
      providesTags: ["Loyalty"],
    }),

    addBonusPoints: builder.mutation({
      query: ({ passengerId, ...data }) => ({
        url:    `${LOYALTY_URL}/${passengerId}/bonus`,
        method: "POST",
        body:   data,
      }),
      invalidatesTags: ["Loyalty"],
    }),

  }),
});

export const {
  useGetMyLoyaltyQuery,
  useEarnPointsMutation,
  useRedeemPointsMutation,
  useGetAllLoyaltyQuery,
  useAddBonusPointsMutation,
} = loyaltyApiSlice;