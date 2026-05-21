// slices/medicalApiSlice.js
import { apiSlice } from "./apiSlice";

const MEDICAL_URL = "/api/medical";

const medicalApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/medical — create incident report (crew)
    createMedicalRecord: builder.mutation({
      query: (data) => ({
        url: MEDICAL_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Medical"],
    }),

    // GET /api/medical/my — crew's own reports
    getMyMedicalRecords: builder.query({
      query: ({ status = "all", page = 1, limit = 8 } = {}) => ({
        url: `${MEDICAL_URL}/my`,
        params: { status, page, limit },
      }),
      providesTags: ["Medical"],
    }),

    // GET /api/medical — all records (admin)
    getAllMedicalRecords: builder.query({
      query: ({
        status = "all",
        userType = "all",
        flightId,
        page = 1,
        limit = 15,
      } = {}) => ({
        url: MEDICAL_URL,
        params: { status, userType, flightId, page, limit },
      }),
      providesTags: ["Medical"],
    }),

    // PATCH /api/medical/:id/status — update status (admin)
    updateMedicalRecordStatus: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${MEDICAL_URL}/${id}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Medical"],
    }),
  }),
});

export const {
  useCreateMedicalRecordMutation,
  useGetMyMedicalRecordsQuery,
  useGetAllMedicalRecordsQuery,
  useUpdateMedicalRecordStatusMutation,
} = medicalApiSlice;
