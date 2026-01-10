"use client";

import { WebhookTestPanel } from "@/features/integrations";

export default function IntegrationsPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                <p className="text-muted-foreground">
                    Trigger inbound webhooks to verify provider handling.
                </p>
            </div>
            <WebhookTestPanel />
        </div>
    );
}
