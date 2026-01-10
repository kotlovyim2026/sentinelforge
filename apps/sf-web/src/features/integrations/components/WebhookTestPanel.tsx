"use client";

import { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSendWebhookMutation } from "../api/integrationsApi";
import type { WebhookProvider } from "../types/webhook.types";

const providers: { label: string; value: WebhookProvider }[] = [
    { label: "PagerDuty", value: "pagerduty" },
    { label: "Opsgenie", value: "opsgenie" },
    { label: "Datadog", value: "datadog" },
    { label: "Custom", value: "custom" },
];

export function WebhookTestPanel() {
    const defaultPayload = useMemo(
        () =>
            JSON.stringify(
                {
                    incident_id: "incident-123",
                    severity: "high",
                    message: "Database connection timeout detected",
                },
                null,
                2
            ),
        []
    );

    const [provider, setProvider] = useState<WebhookProvider>("pagerduty");
    const [eventId, setEventId] = useState("evt-001");
    const [orgId, setOrgId] = useState("org-123");
    const [eventType, setEventType] = useState("incident.triggered");
    const [payload, setPayload] = useState(defaultPayload);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [sendWebhook, { isLoading }] = useSendWebhookMutation();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        let parsedPayload: unknown;
        try {
            parsedPayload = JSON.parse(payload);
        } catch (err) {
            setError("Payload must be valid JSON.");
            return;
        }

        try {
            await sendWebhook({
                provider,
                data: {
                    event_id: eventId.trim(),
                    org_id: orgId.trim(),
                    type: eventType.trim(),
                    payload: parsedPayload,
                },
            }).unwrap();
            setSuccess("Webhook delivered to the gateway.");
        } catch (err) {
            setError(
                "Webhook delivery failed. Check the gateway logs for details."
            );
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Webhook Test Harness</CardTitle>
                <CardDescription>
                    Send sample events to `/webhooks/:provider` through the
                    gateway.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {success && (
                        <Alert>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Provider
                            </label>
                            <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={provider}
                                onChange={(event) =>
                                    setProvider(
                                        event.target.value as WebhookProvider
                                    )
                                }
                                disabled={isLoading}
                            >
                                {providers.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Event Type
                            </label>
                            <Input
                                value={eventType}
                                onChange={(event) =>
                                    setEventType(event.target.value)
                                }
                                placeholder="incident.triggered"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Event ID
                            </label>
                            <Input
                                value={eventId}
                                onChange={(event) =>
                                    setEventId(event.target.value)
                                }
                                placeholder="evt-001"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Org ID
                            </label>
                            <Input
                                value={orgId}
                                onChange={(event) =>
                                    setOrgId(event.target.value)
                                }
                                placeholder="org-123"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Payload (JSON)
                        </label>
                        <Textarea
                            value={payload}
                            onChange={(event) => setPayload(event.target.value)}
                            className="min-h-40 font-mono"
                            disabled={isLoading}
                        />
                    </div>

                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send webhook"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
