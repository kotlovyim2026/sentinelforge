import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create Account - SentinelForge",
    description: "Create your SentinelForge account",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
