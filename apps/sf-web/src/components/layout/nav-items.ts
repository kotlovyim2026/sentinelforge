import {
    Activity,
    Settings,
    Plug2,
    LayoutDashboard,
    AlertTriangle,
    Bell,
    Workflow,
    FileText,
    Shield,
    ScrollText,
    Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
}

export const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        title: "Incidents",
        href: "/incidents",
        icon: AlertTriangle,
    },
    {
        title: "Alerts",
        href: "/alerts",
        icon: Bell,
    },
    {
        title: "Playbooks",
        href: "/playbooks",
        icon: Workflow,
    },
    {
        title: "Evidence",
        href: "/evidence",
        icon: FileText,
    },
    {
        title: "Integrations",
        href: "/integrations",
        icon: Plug2,
    },
    {
        title: "Policies",
        href: "/policies",
        icon: Shield,
    },
    {
        title: "AI",
        href: "/ai",
        icon: Sparkles,
    },
    {
        title: "Audit Log",
        href: "/audit",
        icon: ScrollText,
    },
    {
        title: "System Status",
        href: "/status",
        icon: Activity,
    },
    {
        title: "Settings",
        href: "/settings",
        icon: Settings,
    },
];
