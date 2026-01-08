"use client";

import { useGetSystemStatusQuery } from "../api/statusApi";
import { ServiceCard } from "./ServiceCard";
import { InfraCard } from "./InfraCard";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, AlertCircle } from "lucide-react";

export function StatusDashboard() {
    const {
        data: systemStatus,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useGetSystemStatusQuery(undefined, {
        pollingInterval: 1000 * 60, // Auto-refresh every 60 seconds
        skipPollingIfUnfocused: true, // Stop polling when tab is inactive
        refetchOnFocus: true, // Refresh when tab gains focus
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading System Status</AlertTitle>
                <AlertDescription>
                    Unable to fetch system status. Please try again later.
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="mt-2"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (!systemStatus) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        System Status
                    </h1>
                    <p className="text-muted-foreground">
                        Real-time monitoring of all services
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusBadge status={systemStatus.status} />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${
                                isFetching ? "animate-spin" : ""
                            }`}
                        />
                        Refresh
                    </Button>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Services</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {systemStatus.services.map((service) => (
                        <ServiceCard key={service.name} service={service} />
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Infrastructure</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {systemStatus.infrastructure.map((infra) => (
                        <InfraCard key={infra.name} infra={infra} />
                    ))}
                </div>
            </div>

            <div className="text-sm text-muted-foreground text-center">
                Last updated:{" "}
                {new Date(systemStatus.timestamp).toLocaleString()}
            </div>
        </div>
    );
}
