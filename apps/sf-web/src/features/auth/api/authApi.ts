import { baseApi } from "@/lib/api/baseApi";
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
} from "../types/auth.types";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<AuthResponse, LoginRequest>({
            query: (credentials) => ({
                url: "/auth/login",
                method: "POST",
                body: credentials,
            }),
        }),
        register: builder.mutation<AuthResponse, RegisterRequest>({
            query: (data) => ({
                url: "/auth/register",
                method: "POST",
                body: data,
            }),
        }),
        logout: builder.mutation<void, void>({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
            }),
        }),
        getCurrentUser: builder.query<AuthResponse, void>({
            query: () => "/auth/me",
        }),
        refreshToken: builder.mutation<void, void>({
            query: () => ({
                url: "/auth/refresh",
                method: "POST",
            }),
        }),
    }),
});

export const {
    useLoginMutation,
    useRegisterMutation,
    useLogoutMutation,
    useGetCurrentUserQuery,
    useRefreshTokenMutation,
} = authApi;
