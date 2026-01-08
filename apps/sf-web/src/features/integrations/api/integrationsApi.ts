import { baseApi } from "@/lib/api/baseApi";
import type {
    WebhookRequest,
    WebhookResponse,
    WebhookProvider,
} from "../types/webhook.types";

export const integrationsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        sendWebhook: builder.mutation<
            WebhookResponse,
            { provider: WebhookProvider; data: WebhookRequest }
        >({
            query: ({ provider, data }) => ({
                url: `/webhooks/${provider}`,
                method: "POST",
                body: data,
            }),
        }),
    }),
});

export const { useSendWebhookMutation } = integrationsApi;
