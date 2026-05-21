import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "" }),
  tagTypes: [
    "User",
    "Aircraft",
    "Flight",
    "Crew",
    "Loyalty",
    "Booking",
    "Refund",
  ],
  endpoints: () => ({}),
});
