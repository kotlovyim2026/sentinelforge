import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginMutation, useRegisterMutation } from "../api/authApi";
import {
    loginSchema,
    registerSchema,
    type LoginFormData,
    type RegisterFormData,
} from "../schemas/auth.schemas";

export function useLoginForm() {
    const router = useRouter();
    const [login, { isLoading, error, isSuccess }] = useLoginMutation();

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    useEffect(() => {
        if (isSuccess) {
            router.push("/");
        }
    }, [isSuccess, router]);

    const onSubmit = async (data: LoginFormData) => {
        try {
            await login(data).unwrap();
        } catch (err) {}
    };

    const getErrorMessage = () => {
        if (!error) return null;
        if ("data" in error) {
            return (
                (error.data as { message?: string })?.message || "Login failed"
            );
        }
        return "Login failed";
    };

    return {
        form,
        onSubmit: form.handleSubmit(onSubmit),
        isLoading,
        error: getErrorMessage(),
    };
}

export function useRegisterForm() {
    const router = useRouter();
    const [register, { isLoading, error, isSuccess }] = useRegisterMutation();

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            displayName: "",
            organizationName: "",
            password: "",
        },
    });

    useEffect(() => {
        if (isSuccess) {
            router.push("/");
        }
    }, [isSuccess, router]);

    const onSubmit = async (data: RegisterFormData) => {
        try {
            await register({
                ...data,
                displayName: data.displayName || undefined,
            }).unwrap();
        } catch (err) {}
    };

    const getErrorMessage = () => {
        if (!error) return null;
        if ("data" in error) {
            return (
                (error.data as { message?: string })?.message ||
                "Registration failed"
            );
        }
        return "Registration failed";
    };

    return {
        form,
        onSubmit: form.handleSubmit(onSubmit),
        isLoading,
        error: getErrorMessage(),
    };
}
