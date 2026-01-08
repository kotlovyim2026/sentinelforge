"use client";

import { Provider } from "react-redux";
import { ThemeProvider } from "next-themes";
import { store } from "./store";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <ThemeProvider attribute="class" defaultTheme="dark">
                {children}
            </ThemeProvider>
        </Provider>
    );
}
