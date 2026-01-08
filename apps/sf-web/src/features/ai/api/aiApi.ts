import { baseApi } from "@/lib/api/baseApi";
import type { ExplainRequest, ExplainResponse } from "../types/ai.types";

export const aiApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        explainIncident: builder.mutation<ExplainResponse, ExplainRequest>({
            query: (body) => ({
                url: "/ai/explain",
                method: "POST",
                body,
            }),
        }),
    }),
});

export const { useExplainIncidentMutation } = aiApi;
