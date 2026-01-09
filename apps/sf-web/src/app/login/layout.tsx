import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In - SentinelForge",
    description: "Sign in to your SentinelForge account",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
