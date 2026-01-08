import { baseApi } from "@/lib/api/baseApi";
import type { SystemStatus } from "../types/status.types";

export const statusApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getSystemStatus: builder.query<SystemStatus, void>({
            query: () => "/health/system",
            providesTags: ["SystemStatus"],
            keepUnusedDataFor: 10,
        }),
    }),
});

export const { useGetSystemStatusQuery } = statusApi;
