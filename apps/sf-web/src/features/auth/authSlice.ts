import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, User, Organization } from "./types/auth.types";
import { authApi } from "./api/authApi";

const initialState: AuthState = {
    user: null,
    org: null,
    role: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{
                user: User;
                org: Organization;
                role: string;
            }>
        ) => {
            state.user = action.payload.user;
            state.org = action.payload.org;
            state.role = action.payload.role;
            state.isAuthenticated = true;
        },
        clearCredentials: (state) => {
            state.user = null;
            state.org = null;
            state.role = null;
            state.isAuthenticated = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addMatcher(
                authApi.endpoints.login.matchFulfilled,
                (state, { payload }) => {
                    state.user = payload.user;
                    state.org = payload.org;
                    state.role = payload.role;
                    state.isAuthenticated = true;
                }
            )
            .addMatcher(
                authApi.endpoints.register.matchFulfilled,
                (state, { payload }) => {
                    state.user = payload.user;
                    state.org = payload.org;
                    state.role = payload.role;
                    state.isAuthenticated = true;
                }
            )
            .addMatcher(
                authApi.endpoints.getCurrentUser.matchFulfilled,
                (state, { payload }) => {
                    state.user = payload.user;
                    state.org = payload.org;
                    state.role = payload.role;
                    state.isAuthenticated = true;
                }
            )
            .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
                state.user = null;
                state.org = null;
                state.role = null;
                state.isAuthenticated = false;
            })
            .addMatcher(
                authApi.endpoints.getCurrentUser.matchRejected,
                (state) => {
                    state.user = null;
                    state.org = null;
                    state.role = null;
                    state.isAuthenticated = false;
                }
            );
    },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) =>
    state.auth.user;
export const selectCurrentOrg = (state: { auth: AuthState }) => state.auth.org;
export const selectCurrentRole = (state: { auth: AuthState }) =>
    state.auth.role;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
    state.auth.isAuthenticated;
