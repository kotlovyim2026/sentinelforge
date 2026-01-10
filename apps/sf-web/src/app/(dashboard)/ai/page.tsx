"use client";

import { ExplainPanel } from "@/features/ai";

export default function AiPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">AI</h1>
                <p className="text-muted-foreground">
                    Exercise the `/ai/explain` endpoint with live requests.
                </p>
            </div>
            <ExplainPanel />
        </div>
    );
}
