"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Moon, Sun, PanelLeft } from "lucide-react";
import { useTheme } from "next-themes";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AccountPill } from "@/components/auth/AccountPill";
import { navItems } from "./nav-items";

export function AppSidebar() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { toggleSidebar } = useSidebar();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
                    <Link
                        href="/"
                        className="flex items-center gap-2 group-data-[collapsible=icon]:hidden"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <Activity className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="font-semibold">SentinelForge</span>
                    </Link>
                    <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="hidden group-data-[collapsible=icon]:flex h-8 w-8 group relative"
                    >
                        <Activity className="h-5 w-5 absolute inset-0 m-auto transition-opacity group-hover:opacity-0" />
                        <PanelLeft className="h-5 w-5 absolute inset-0 m-auto opacity-0 transition-opacity group-hover:opacity-100" />
                    </Button>
                </div>
                <SidebarSeparator className="mx-0! w-full!" />
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.href}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.href}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() =>
                                setTheme(theme === "dark" ? "light" : "dark")
                            }
                            tooltip={
                                theme === "dark" ? "Light Mode" : "Dark Mode"
                            }
                        >
                            {theme === "dark" ? <Sun /> : <Moon />}
                            <span>
                                {theme === "dark" ? "Light Mode" : "Dark Mode"}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarSeparator className="mx-0! w-full!" />
                <AccountPill />
            </SidebarFooter>
        </Sidebar>
    );
}
