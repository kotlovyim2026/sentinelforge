import { Badge } from "@/components/ui/badge";
import type { ServiceStatus } from "../types/status.types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: ServiceStatus;
    className?: string;
}

const statusConfig = {
    healthy: {
        label: "Healthy",
        variant: "default" as const,
        className: "bg-green-500 hover:bg-green-600",
    },
    degraded: {
        label: "Degraded",
        variant: "secondary" as const,
        className: "bg-yellow-500 hover:bg-yellow-600",
    },
    unhealthy: {
        label: "Unhealthy",
        variant: "destructive" as const,
        className: "bg-red-500 hover:bg-red-600",
    },
    unknown: {
        label: "Unknown",
        variant: "outline" as const,
        className: "bg-gray-500 hover:bg-gray-600",
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <Badge
            variant={config.variant}
            className={cn(config.className, "text-white", className)}
        >
            {config.label}
        </Badge>
    );
}
