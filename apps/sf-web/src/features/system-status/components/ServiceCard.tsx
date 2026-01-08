import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ServiceHealth } from "../types/status.types";

interface ServiceCardProps {
    service: ServiceHealth;
}

export function ServiceCard({ service }: ServiceCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg capitalize">
                            {service.name}
                        </CardTitle>
                    </div>
                    <StatusBadge status={service.status} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground">
                    {service.ok ? (
                        <span className="text-green-600">Operational</span>
                    ) : (
                        <span className="text-red-600">
                            Service Unavailable
                        </span>
                    )}
                </div>
                {service.service && (
                    <div className="text-xs text-muted-foreground mt-2">
                        Service: {service.service}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
