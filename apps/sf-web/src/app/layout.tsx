import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "SentinelForge - System Monitoring",
    description:
        "Real-time monitoring and management for SentinelForge ecosystem",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning className="dark">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Providers>
                    <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                            <main className="flex-1 overflow-y-auto">
                                <div className="container mx-auto p-6 md:p-8">
                                    {children}
                                </div>
                            </main>
                        </SidebarInset>
                    </SidebarProvider>
                </Providers>
            </body>
        </html>
    );
}
