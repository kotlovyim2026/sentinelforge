export type ServiceStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface ServiceHealth {
    name: string;
    status: ServiceStatus;
    ok: boolean;
    service?: string;
}

export interface InfraHealth {
    name: string;
    type: "database" | "cache" | "queue";
    status: ServiceStatus;
    ok: boolean;
    connectionCount?: number;
    message?: string;
}

export interface SystemStatus {
    status: ServiceStatus;
    services: ServiceHealth[];
    infrastructure: InfraHealth[];
    timestamp: string;
}
