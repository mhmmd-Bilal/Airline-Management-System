// slices/flightApiSlice.js
import { apiSlice } from "./apiSlice";

const FLIGHTS_URL = "/api/flights";

const flightApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/flights?status=&search=&page=&limit=
    getAllFlights: builder.query({
      query: ({ status = "all", search = "", page = 1, limit = 10 } = {}) => ({
        url: FLIGHTS_URL,
        params: { status, search, page, limit },
      }),
      providesTags: ["Flight"],
    }),

    // GET /api/flights/stats
    getFlightStats: builder.query({
      query: () => ({ url: `${FLIGHTS_URL}/stats` }),
      providesTags: ["Flight"],
    }),

    // GET /api/flights/:id
    getFlightById: builder.query({
      query: (id) => ({ url: `${FLIGHTS_URL}/${id}` }),
      providesTags: ["Flight"],
    }),

    // GET /api/flights/crew/:crewId?status=&page=&limit=
    getFlightsByCrewId: builder.query({
      query: ({ crewId, status = "all", page = 1, limit = 10 } = {}) => ({
        url: `${FLIGHTS_URL}/crew/${crewId}`,
        params: { status, page, limit },
      }),
      providesTags: ["Flight"],
    }),

    // POST /api/flights
    createFlight: builder.mutation({
      query: (data) => ({
        url: FLIGHTS_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Flight"],
    }),

    // PUT /api/flights/:id — handles all field updates
    updateFlight: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${FLIGHTS_URL}/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Flight"],
    }),

    // DELETE /api/flights/:id
    deleteFlight: builder.mutation({
      query: (id) => ({
        url: `${FLIGHTS_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Flight"],
    }),
    searchFlights: builder.query({
      query: ({ source, destination, date, passengers = 1 }) => ({
        url: `${FLIGHTS_URL}/search`,
        params: { source, destination, date, passengers },
      }),
      providesTags: ["Flight"],
    }),
    getBookedFlights: builder.query({
      query: () => ({
        url: `${FLIGHTS_URL}/my-booked-flights`,
      }),
      providesTags: ["Flight"],
    }),
    trackMyFlight: builder.query({
      query: (flightId) => ({
        url: `${FLIGHTS_URL}/track-my-flight/${flightId}`,
      }),
      providesTags: ["Flight"],
    }),
  }),
});

export const {
  useGetAllFlightsQuery,
  useGetFlightStatsQuery,
  useGetFlightByIdQuery,
  useGetFlightsByCrewIdQuery,
  useLazyGetFlightsByCrewIdQuery,
  useCreateFlightMutation,
  useUpdateFlightMutation,
  useDeleteFlightMutation,
  useSearchFlightsQuery,
  useGetBookedFlightsQuery,
  useTrackMyFlightQuery,
} = flightApiSlice;
