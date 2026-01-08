import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Database, Layers, MessageSquare } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { InfraHealth } from "../types/status.types";

interface InfraCardProps {
    infra: InfraHealth;
}

const iconMap = {
    database: Database,
    cache: Layers,
    queue: MessageSquare,
};

export function InfraCard({ infra }: InfraCardProps) {
    const Icon = iconMap[infra.type];

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg capitalize">
                            {infra.name}
                        </CardTitle>
                    </div>
                    <StatusBadge status={infra.status} />
                </div>
                {infra.message && (
                    <CardDescription className="mt-2">
                        {infra.message}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground">
                    {infra.ok ? (
                        <span className="text-green-600">Connected</span>
                    ) : (
                        <span className="text-red-600">Connection Failed</span>
                    )}
                </div>
                {infra.connectionCount !== undefined && (
                    <div className="mt-2">
                        <div className="text-xs text-muted-foreground">
                            Active Connections
                        </div>
                        <div className="text-xl font-bold">
                            {infra.connectionCount}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
