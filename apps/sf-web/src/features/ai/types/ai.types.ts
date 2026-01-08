export interface ExplainRequest {
    incident_id: string;
    evidence?: string[];
}

export interface ExplainResponse {
    summary: string;
    citations: number[];
}
