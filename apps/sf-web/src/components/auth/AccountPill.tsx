"use client";

import { useSelector } from "react-redux";
import {
    selectCurrentUser,
    selectCurrentOrg,
    selectCurrentRole,
    useLogoutMutation,
} from "@/features/auth";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function AccountPill() {
    const user = useSelector(selectCurrentUser);
    const org = useSelector(selectCurrentOrg);
    const role = useSelector(selectCurrentRole);
    const [logout] = useLogoutMutation();
    const router = useRouter();

    if (!user || !org) {
        return null;
    }

    const initials = user.displayName
        ? user.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
        : user.email[0].toUpperCase();

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            router.push("/login");
        } catch (error) {
            router.push("/login");
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative w-full justify-start group-data-[collapsible=icon]:justify-center h-auto px-2 py-2 hover:bg-accent"
                >
                    <div className="flex items-center gap-2 w-full group-data-[collapsible=icon]:w-auto">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-left flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="text-sm font-medium truncate w-full">
                                {user.displayName || user.email}
                            </span>
                            <span className="text-xs text-muted-foreground truncate w-full">
                                {org.name}
                            </span>
                        </div>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {user.displayName || "Account"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span className="capitalize">{role}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
