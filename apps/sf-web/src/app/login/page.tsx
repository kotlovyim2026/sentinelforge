"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/features/auth";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/features/auth";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/status");
        }
    }, [isAuthenticated, router]);

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex flex-col space-y-2 text-center">
                        <Link
                            href="/"
                            className="flex items-center gap-2 justify-center mb-4"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                <Activity className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold">
                                SentinelForge
                            </span>
                        </Link>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your credentials to access your account
                        </p>
                    </div>
                    <LoginForm />
                </div>
            </div>

            <div className="hidden lg:flex items-center justify-center bg-muted p-8">
                <div className="max-w-md space-y-6">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Secure, Local-First SecOps Platform
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Monitor your infrastructure, manage incidents, and
                        automate security operations — all running locally with
                        enterprise-grade security.
                    </p>
                    <div className="space-y-4 pt-4">
                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    Zero-Trust Security
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    RBAC + ABAC with full audit trail
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    AI-Powered Analysis
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Intelligent incident summaries with
                                    citations
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    Automated Playbooks
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    SOAR with retries and error handling
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
