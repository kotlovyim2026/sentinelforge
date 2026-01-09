"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/features/auth";
import { Activity, Shield, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LandingPage() {
    const router = useRouter();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/status");
        }
    }, [isAuthenticated, router]);

    return (
        <div className="flex flex-col min-h-screen">
            <header className="border-b">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                            <Activity className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold">SentinelForge</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/register">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <section className="container mx-auto px-6 py-24 text-center">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                            Local-First SecOps
                            <br />
                            <span className="text-primary">Platform</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Alert ingestion, incident triage, AI-powered
                            explanations, SOAR playbooks, and Zero-Trust policy
                            enforcement — all running locally.
                        </p>
                        <div className="flex gap-4 justify-center pt-4">
                            <Button size="lg" asChild>
                                <Link href="/register">Start Free Trial</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/login">Sign In</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="container mx-auto px-6 py-24">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="space-y-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Activity className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">
                                SOAR Playbooks
                            </h3>
                            <p className="text-muted-foreground">
                                Deterministic executor with retries, backoff,
                                and DLQ handling for reliable automation.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Zap className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">
                                AI Assistant
                            </h3>
                            <p className="text-muted-foreground">
                                Mock LLM with citations for incident summaries,
                                stored as drafts and fully audited.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">
                                Zero-Trust Access
                            </h3>
                            <p className="text-muted-foreground">
                                RBAC + ABAC policy engine with reasons and
                                simulation capabilities.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">
                                Event-Driven
                            </h3>
                            <p className="text-muted-foreground">
                                RabbitMQ topic exchange, versioned events, and
                                idempotent consumers.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="border-t">
                    <div className="container mx-auto px-6 py-24 text-center">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <h2 className="text-4xl font-bold">
                                Ready to get started?
                            </h2>
                            <p className="text-xl text-muted-foreground">
                                Join teams using SentinelForge for modern
                                security operations.
                            </p>
                            <Button size="lg" asChild>
                                <Link href="/register">
                                    Create Your Account
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <span className="font-semibold">SentinelForge</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © 2026 SentinelForge. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
