# sf-web — SentinelForge Frontend

Web interface for monitoring and managing the SentinelForge ecosystem.

## Tech Stack

-   **Framework**: Next.js 16 (App Router)
-   **UI Library**: shadcn/ui + Tailwind v4
-   **State Management**: Redux Toolkit + RTK Query
-   **Icons**: Lucide React
-   **Language**: TypeScript

## Architecture Overview

### Feature-Based Structure

We use a **feature-based architecture** instead of traditional layered approach. Each feature is self-contained with its own components, hooks, types, and API endpoints.

```
src/
├── app/                           # Next.js App Router
│   ├── (dashboard)/              # Route group for authenticated pages
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── status/               # System status feature
│   │   ├── integrations/         # Integrations management
│   │   └── settings/             # Settings pages
│   ├── layout.tsx                # Root layout + providers
│   ├── page.tsx                  # Landing/redirect
│   └── globals.css               # Global Tailwind config
│
├── features/                      # Feature modules (domain logic)
│   ├── system-status/
│   │   ├── components/           # Feature-specific components
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── HealthChart.tsx
│   │   ├── hooks/                # Feature-specific hooks
│   │   │   └── useSystemHealth.ts
│   │   ├── api/                  # RTK Query endpoints
│   │   │   └── statusApi.ts
│   │   ├── types/                # Feature types
│   │   │   └── status.types.ts
│   │   └── utils/                # Feature utilities
│   │       └── statusHelpers.ts
│   │
│   ├── integrations/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
│   │
│   └── auth/
│       ├── components/
│       ├── api/
│       └── types/
│
├── components/                    # Shared/reusable components
│   ├── ui/                       # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── layout/                   # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── common/                   # Generic shared components
│       ├── ErrorBoundary.tsx
│       ├── LoadingSpinner.tsx
│       └── EmptyState.tsx
│
├── lib/                          # Shared utilities
│   ├── store.ts                  # Redux store configuration
│   ├── api/                      # Shared API config
│   │   └── baseApi.ts
│   └── utils/                    # Common utilities
│       ├── cn.ts                 # Class name utility
│       ├── formatters.ts
│       └── validators.ts
│
├── hooks/                        # Global custom hooks
│   ├── useLocalStorage.ts
│   ├── useMediaQuery.ts
│   └── useDebounce.ts
│
└── types/                        # Global TypeScript types
    ├── api.types.ts
    └── common.types.ts
```

## Component Architecture

### 1. Component Hierarchy

**Server Components (Default)**

-   Use for static content, data fetching at build/request time
-   No client-side interactivity
-   Better performance, smaller bundle

**Client Components (`'use client'`)**

-   Required for: useState, useEffect, event handlers, browser APIs
-   Required for: RTK Query hooks
-   Keep minimal and deep in the tree

### 2. Component Patterns

**Smart vs Presentational**

```tsx
// ❌ BAD: Mixed concerns
export function ServiceCard({ serviceId }: Props) {
    const { data } = useGetServiceQuery(serviceId);
    return <div>{/* rendering logic */}</div>;
}

// ✅ GOOD: Separated concerns
// Smart component (data fetching)
export function ServiceCardContainer({ serviceId }: Props) {
    const { data, isLoading } = useGetServiceQuery(serviceId);
    if (isLoading) return <LoadingSpinner />;
    return <ServiceCard service={data} />;
}

// Presentational component (pure rendering)
export function ServiceCard({ service }: Props) {
    return <div>{/* rendering logic */}</div>;
}
```

**Composition over Configuration**

```tsx
// ❌ BAD: Props explosion
<Card
  title="Status"
  icon="check"
  showHeader
  headerColor="blue"
  footer={...}
/>

// ✅ GOOD: Composable
<Card>
  <CardHeader>
    <CheckIcon />
    <CardTitle>Status</CardTitle>
  </CardHeader>
  <CardContent>{...}</CardContent>
  <CardFooter>{...}</CardFooter>
</Card>
```

### 3. State Management

**When to use what:**

| State Type              | Solution             | Example                   |
| ----------------------- | -------------------- | ------------------------- |
| Server state (API data) | RTK Query            | Service health, user data |
| Global UI state         | Redux Toolkit        | Theme, sidebar collapsed  |
| Local UI state          | useState             | Modal open, form input    |
| URL state               | Next.js searchParams | Filters, pagination       |
| Form state              | React Hook Form      | Login, settings forms     |

### 4. Feature Module Guidelines

Each feature should be:

-   **Self-contained**: All related code in one directory
-   **Exportable**: Single index.ts barrel export
-   **Testable**: Easy to mock and test in isolation
-   **Documented**: README.md for complex features

```tsx
// features/system-status/index.ts
export { StatusDashboard } from "./components/StatusDashboard";
export { useSystemHealth } from "./hooks/useSystemHealth";
export { statusApi } from "./api/statusApi";
export type { ServiceStatus, HealthMetrics } from "./types";
```

## Development Workflow

### Quick Start

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint check
pnpm type-check       # TypeScript check
```

### Adding a New Feature

1. **Create feature directory** under `src/features/<feature-name>/`
2. **Add components** in `components/` subdirectory
3. **Define types** in `types/` subdirectory
4. **Create API endpoints** in `api/` using RTK Query
5. **Add custom hooks** in `hooks/` if needed
6. **Export via barrel** in `index.ts`

### Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
```

### Creating RTK Query Endpoints

```tsx
// features/system-status/api/statusApi.ts
import { baseApi } from "@/lib/api/baseApi";
import type { SystemStatus } from "../types";

export const statusApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getSystemStatus: builder.query<SystemStatus, void>({
            query: () => "/health/system",
            providesTags: ["SystemStatus"],
        }),
        refreshService: builder.mutation<void, string>({
            query: (serviceId) => ({
                url: `/services/${serviceId}/restart`,
                method: "POST",
            }),
            invalidatesTags: ["SystemStatus"],
        }),
    }),
});

export const { useGetSystemStatusQuery, useRefreshServiceMutation } = statusApi;
```

## Best Practices

### Code Quality

1. **TypeScript Strict Mode**

    - All types must be explicit
    - No `any` types (use `unknown` if needed)
    - Enable strict null checks

2. **Component Design**

    - Single Responsibility Principle
    - Max 250 lines per component (split if larger)
    - Props should have clear, documented types
    - Use composition over props drilling

3. **Performance**
    - Use React.memo() for expensive pure components
    - Lazy load heavy features with next/dynamic
    - Optimize images with next/image
    - Use RTK Query cache invalidation strategically

### Refactoring Guidelines

**When to refactor:**

-   Component > 250 lines
-   3+ levels of prop drilling
-   Duplicate logic in 3+ places
-   Complex conditional rendering (5+ branches)

**How to refactor:**

```tsx
// ❌ Before: Complex component
export function StatusDashboard() {
    // 300 lines of mixed logic
    const [filter, setFilter] = useState("");
    const { data } = useGetStatusQuery();
    const filtered = data?.filter(/* complex logic */);
    return <div>{/* 100 lines of JSX */}</div>;
}

// ✅ After: Split into smaller pieces
// features/system-status/hooks/useFilteredStatus.ts
export function useFilteredStatus(filter: string) {
    const { data } = useGetStatusQuery();
    return useMemo(() => data?.filter(/* extracted logic */), [data, filter]);
}

// features/system-status/components/StatusDashboard.tsx
export function StatusDashboard() {
    const [filter, setFilter] = useState("");
    const filtered = useFilteredStatus(filter);

    return (
        <div>
            <StatusFilters value={filter} onChange={setFilter} />
            <StatusGrid items={filtered} />
        </div>
    );
}
```

### Optimization Strategies

**1. Bundle Size**

```tsx
// Use dynamic imports for large dependencies
const HeavyChart = dynamic(() => import("./HeavyChart"), {
    loading: () => <LoadingSpinner />,
    ssr: false,
});
```

**2. Re-render Optimization**

```tsx
// Memoize expensive computations
const sortedData = useMemo(() => data.sort(compareFunction), [data]);

// Memoize callbacks passed to children
const handleClick = useCallback(() => {
    doSomething(id);
}, [id]);
```

**3. RTK Query Optimization**

```tsx
// Polling with smart intervals
useGetSystemStatusQuery(undefined, {
    pollingInterval: 10000, // 10s
    skipPollingIfUnfocused: true, // Stop when tab inactive
    refetchOnFocus: true, // Refresh on tab focus
});

// Prefetch data for better UX
const [prefetchServiceDetails] = usePrefetch("getServiceDetails");
<Link onMouseEnter={() => prefetchServiceDetails(id)} />;
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

## Related Documentation

-   [System Design](../../docs/system-design.md)
-   [API Gateway](../sf-gateway/README.md)
-   [Eventing Contract](../../docs/eventing-contract.md)
