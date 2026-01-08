export interface WebhookRequest {
    event_id: string;
    org_id: string;
    type: string;
    payload: any;
}

export interface WebhookResponse {
    ok: boolean;
}

export type WebhookProvider = "pagerduty" | "opsgenie" | "datadog" | "custom";
