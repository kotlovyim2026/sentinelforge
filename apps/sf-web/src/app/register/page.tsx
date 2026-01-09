"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/features/auth";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/features/auth";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/status");
        }
    }, [isAuthenticated, router]);

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:flex items-center justify-center bg-muted p-8">
                <div className="max-w-md space-y-6">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Start Your Security Operations Journey
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Join organizations leveraging SentinelForge for modern,
                        local-first security operations.
                    </p>
                    <div className="space-y-4 pt-4">
                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    Enterprise-Grade Security
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Built with security best practices
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    Local-First Design
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Full control, no cloud dependencies
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Easy to Deploy</p>
                                <p className="text-sm text-muted-foreground">
                                    Docker-based, ready in minutes
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
                            Create your account
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Get started with SentinelForge today
                        </p>
                    </div>
                    <RegisterForm />
                </div>
            </div>
        </div>
    );
}
