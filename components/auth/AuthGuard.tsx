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

    return null;
}
