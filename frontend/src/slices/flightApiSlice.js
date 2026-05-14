// slices/flightApiSlice.js
import { apiSlice } from "./apiSlice";

const FLIGHTS_URL = "/api/flights";

const flightApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllFlights: builder.query({
      query: ({ status = "all", search = "", page = 1, limit = 10 } = {}) => ({
        url: FLIGHTS_URL,
        params: { status, search, page, limit },
      }),
      providesTags: ["Flight"],
    }),

    getFlightStats: builder.query({
      query: () => ({ url: `${FLIGHTS_URL}/stats` }),
      providesTags: ["Flight"],
    }),

    getFlightById: builder.query({
      query: (id) => ({ url: `${FLIGHTS_URL}/${id}` }),
      providesTags: ["Flight"],
    }),

    createFlight: builder.mutation({
      query: (data) => ({
        url: FLIGHTS_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Flight"],
    }),

    // handles status, currentStop, crew, or any field — all in one
    updateFlight: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${FLIGHTS_URL}/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Flight"],
    }),

    // PATCH /api/flights/:id/crew
    assignCrew: builder.mutation({
      query: ({ id, crewIds }) => ({
        url: `${FLIGHTS_URL}/${id}/crew`,
        method: "PATCH",
        body: { crewIds },
      }),
      invalidatesTags: ["Flight"],
    }),

    deleteFlight: builder.mutation({
      query: (id) => ({
        url: `${FLIGHTS_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Flight"],
    }),
    getFlightsByCrewId: builder.query({
      query: (params) => ({
        url: `${FLIGHTS_URL}/getFlightsByCrewId`,
        params,
      }),
    }),
  }),
});

export const {
  useGetAllFlightsQuery,
  useGetFlightStatsQuery,
  useGetFlightByIdQuery,
  useCreateFlightMutation,
  useUpdateFlightMutation,
  useDeleteFlightMutation,
  useLazyGetFlightsByCrewIdQuery
} = flightApiSlice;
