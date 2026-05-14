import { apiSlice } from "./apiSlice";

const AIRCRAFT_URL = "/api/aircraft";

const aircraftApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // GET /api/aircraft?status=&search=&page=&limit=
    getAllAircraft: builder.query({
      query: ({ status = "all", search = "", page = 1, limit = 10 } = {}) => ({
        url: AIRCRAFT_URL,
        params: { status, search, page, limit },
      }),
      providesTags: ["Aircraft"],
    }),

    // GET /api/aircraft/stats
    getAircraftStats: builder.query({
      query: () => ({
        url: `${AIRCRAFT_URL}/stats`,
      }),
      providesTags: ["Aircraft"],
    }),

    // GET /api/aircraft/:id
    getAircraftById: builder.query({
      query: (id) => ({
        url: `${AIRCRAFT_URL}/${id}`,
      }),
      providesTags: ["Aircraft"],
    }),

    // POST /api/aircraft
    createAircraft: builder.mutation({
      query: (data) => ({
        url: AIRCRAFT_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Aircraft"],
    }),

    // PUT /api/aircraft/:id
    updateAircraft: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${AIRCRAFT_URL}/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Aircraft"],
    }),

    // DELETE /api/aircraft/:id
    deleteAircraft: builder.mutation({
      query: (id) => ({
        url: `${AIRCRAFT_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Aircraft"],
    }),

  }),
});

export const {
  useGetAllAircraftQuery,
  useGetAircraftStatsQuery,
  useGetAircraftByIdQuery,
  useCreateAircraftMutation,
  useUpdateAircraftMutation,
  useUpdateAircraftStatusMutation,
  useDeleteAircraftMutation,
} = aircraftApiSlice;