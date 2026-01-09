import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl,
        credentials: "include",
        prepareHeaders: (headers) => {
            headers.set("Content-Type", "application/json");
            return headers;
        },
    }),
    tagTypes: ["SystemStatus"],
    endpoints: () => ({}),
});
