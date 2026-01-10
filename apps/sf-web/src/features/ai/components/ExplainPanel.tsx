"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useExplainIncidentMutation } from "../api/aiApi";

export function ExplainPanel() {
    const [incidentId, setIncidentId] = useState("incident-123");
    const [evidence, setEvidence] = useState("log-1\nlog-2");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        summary: string;
        citations: number[];
    } | null>(null);

    const [explain, { isLoading }] = useExplainIncidentMutation();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setResult(null);

        const evidenceList = evidence
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);

        try {
            const response = await explain({
                incident_id: incidentId.trim(),
                evidence: evidenceList.length ? evidenceList : undefined,
            }).unwrap();
            setResult(response);
        } catch (err) {
            setError(
                "Failed to generate explanation. Verify the incident id and try again."
            );
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Explanation Sandbox</CardTitle>
                    <CardDescription>
                        Send an incident id and optional evidence references to
                        the `/ai/explain` endpoint.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Incident ID
                            </label>
                            <Input
                                value={incidentId}
                                onChange={(event) =>
                                    setIncidentId(event.target.value)
                                }
                                placeholder="incident-123"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Evidence references (one per line)
                            </label>
                            <Textarea
                                value={evidence}
                                onChange={(event) =>
                                    setEvidence(event.target.value)
                                }
                                className="min-h-[120px]"
                                placeholder={"log-1\nlog-2"}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Generating..." : "Explain incident"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>AI Summary</CardTitle>
                        <CardDescription>
                            Citations returned by the backend are listed below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm leading-6 text-foreground">
                            {result.summary}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {result.citations.map((index) => (
                                <Badge key={index} variant="secondary">
                                    Citation {index}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
