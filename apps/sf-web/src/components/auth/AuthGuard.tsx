"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { selectCurrentUser, useGetCurrentUserQuery } from "@/features/auth";

const publicRoutes = ["/", "/login", "/register"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const user = useSelector(selectCurrentUser);
    const { isLoading, isError } = useGetCurrentUserQuery();
    const router = useRouter();
    const pathname = usePathname();
    const isPublicRoute = publicRoutes.includes(pathname);

    useEffect(() => {
        if (!isLoading) {
            if (!user && !isPublicRoute) {
                router.push("/login");
            } else if (
                user &&
                (pathname === "/login" || pathname === "/register")
            ) {
                router.push("/status");
            }
        }
    }, [user, isLoading, pathname, router, isPublicRoute]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user && !isPublicRoute) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (user && (pathname === "/login" || pathname === "/register")) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <>{children}</>;
}
