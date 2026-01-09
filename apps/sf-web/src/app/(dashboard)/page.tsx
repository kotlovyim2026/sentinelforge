export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to SentinelForge monitoring platform
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-card p-6">
                    <h3 className="text-lg font-semibold">Quick Stats</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                        Dashboard widgets coming soon...
                    </p>
                </div>
            </div>
        </div>
    );
}
