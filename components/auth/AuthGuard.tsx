"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_ROUTES = [
    "/admincursos",
    "/adminvideos",
    "/adminusuarios",
    "/marketing",
    "/panelcoach"
];

export function AuthGuard() {
    const { user, userProfile, loading, openLoginModal } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            // 1. Check for unauthenticated access
            if (!user && pathname !== "/" && pathname !== "/payment" && pathname !== "/payment2") {
                router.push("/");
                openLoginModal();
                return;
            }

            if (user && userProfile) {
                // 2. Check for profile completion (for users with a plan)
                const subscribedPlans = ["base", "kiconu", "premium"];
                const hasPlan = subscribedPlans.includes(userProfile.user_type || "");

                if (hasPlan && pathname !== "/register" && pathname !== "/") {
                    const requiredFields = ["email", "first_name", "last_name", "age", "height", "weight"];
                    const isMissingFields = requiredFields.some(field => !userProfile[field as keyof typeof userProfile]);

                    if (isMissingFields) {
                        router.push("/register");
                        return;
                    }
                }

                // 3. Check for admin route access
                const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
                if (isAdminRoute && !userProfile.is_admin) {
                    router.push("/cursos");
                }
            }
        }
    }, [user, userProfile, loading, pathname, router, openLoginModal]);

    // Block inactive users with a message
    if (!loading && user && userProfile?.user_type === "inactive") {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4">
                <div className="max-w-md rounded-2xl border border-panel-border bg-panel-card p-8 text-center shadow-xl">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                        <span className="material-symbols-outlined text-3xl text-red-500">block</span>
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-panel-text">Usuario Inactivo</h2>
                    <p className="text-panel-muted">
                        Usuario inactivo. Comunicarse a soporte para cualquier aclaración.
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
