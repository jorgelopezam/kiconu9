"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useMemo } from "react";

import { LogoMark } from "../common/LogoMark";
import { LoginModal } from "../auth/LoginModal";
import { RegisterModal } from "../auth/RegisterModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getUserProfile } from "@/lib/firestore-helpers";

// User types for admin simulation
const USER_TYPES = [
  { id: "admin", label: "Admin", icon: "shield_person" },
  { id: "coach", label: "Coach", icon: "sports" },
  { id: "premium", label: "Premium", icon: "star" },
  { id: "kiconu", label: "Kiconu", icon: "verified" },
  { id: "base", label: "Base", icon: "person" },
] as const;

type UserType = (typeof USER_TYPES)[number]["id"];

export function NavBar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleTypeChange = (typeId: UserType) => {
    setViewAsType(typeId);
    setUserTypeDropdownOpen(false);

    if (typeId === "admin" || typeId === "coach") {
      router.push("/panelcoach");
    } else if (typeId === "base") {
      router.push("/cursos");
    } else {
      router.push("/panel");
    }
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userTypeDropdownOpen, setUserTypeDropdownOpen] = useState(false);
  const [viewAsType, setViewAsType] = useState<UserType>("admin");
  const [userType, setUserType] = useState<string | null>(null);
  const { user, userProfile, logout, isLoginModalOpen, openLoginModal, closeLoginModal, isRegisterModalOpen, openRegisterModal, closeRegisterModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);

  // Determine effective admin status based on view type
  const effectiveIsAdmin = isAdmin && viewAsType === "admin";
  const effectiveIsCoach = (isAdmin || isCoach) && viewAsType === "coach";
  const effectiveUserType = (isAdmin || isCoach) ? viewAsType : (userType as UserType);

  // Determine dashboard link based on user type
  const getDashboardLink = () => {
    if (!user) return "/";
    // Actual coach users (not admin simulation)
    if (isCoach) return "/panelcoach";
    // Admin simulation
    if (effectiveIsAdmin || effectiveIsCoach) return "/panelcoach";
    if (effectiveUserType === "base") return "/cursos";
    return "/panel";
  };

  const version = "6.0.1"

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setDropdownOpen(false);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  useEffect(() => {
    if (!user || !userProfile) {
      setIsAdmin(false);
      setIsCoach(false);
      setUserType(null);
      return;
    }

    setIsAdmin(userProfile.is_admin);
    setIsCoach(!!userProfile.isCoach);
    setUserType(userProfile.user_type || null);

    // Set initial view type based on role
    // If user is a coach but NOT an admin, default to "coach" view
    // (Otherwise it defaults to "admin" which is wrong for non-admin coaches)
    if (userProfile.isCoach && !userProfile.is_admin && viewAsType === "admin") {
      setViewAsType("coach");
    }
  }, [user, userProfile, viewAsType]);

  // Filter available user types based on role
  const availableUserTypes = useMemo<(typeof USER_TYPES)[number][]>(() => {
    if (isAdmin) return [...USER_TYPES];
    if (isCoach) {
      const types: (typeof USER_TYPES)[number][] = [USER_TYPES.find(t => t.id === "coach")!];
      if (userType) {
        const userTypeObj = USER_TYPES.find(t => t.id === userType);
        if (userTypeObj) types.push(userTypeObj);
      }
      return types;
    }
    return [];
  }, [isAdmin, isCoach, userType]);

  return (
    <header className="sticky top-0 z-50 border-b border-sage/20 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-10">

        <Link href={getDashboardLink()}>
          <LogoMark className="text-primary" textClassName="text-foreground" />
        </Link>

        {/* Mobile View Controls */}
        <div className="flex items-center gap-2 md:hidden">
          {/* User type toggle for admins (mobile) */}
          {isAdmin && user && (
            <div className="relative">
              <button
                onClick={() => setUserTypeDropdownOpen(!userTypeDropdownOpen)}
                className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-2 text-sm font-medium text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400"
                aria-label="Select user type to view as"
              >
                <span className="material-symbols-outlined text-lg">
                  {USER_TYPES.find((t) => t.id === viewAsType)?.icon || "person"}
                </span>
                <span className="material-symbols-outlined text-sm">
                  {userTypeDropdownOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {userTypeDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-sage/30 bg-surface shadow-lg">
                  {USER_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleTypeChange(type.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition hover:bg-desert-sand/20 ${viewAsType === type.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                        } `}
                    >
                      <span className="material-symbols-outlined text-lg">{type.icon}</span>
                      {type.label}
                      {viewAsType === type.id && (
                        <span className="material-symbols-outlined ml-auto text-sm text-primary">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center rounded-lg border border-sage/40 p-2 transition hover:bg-desert-sand/20 ${theme === "dark" ? "text-white" : "text-primary"}`}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <span className="material-symbols-outlined text-xl">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>

          {!user ? (
            <>
              <button
                onClick={openLoginModal}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-foreground transition hover:text-primary"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                <span className="hidden sm:inline">Entrar</span>
              </button>
              <button
                onClick={openRegisterModal}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-primary-600"
              >
                Registrarse
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleMenu}
              className="flex h-10 items-center gap-2 rounded-lg border border-sage/40 px-3 text-primary transition"
              aria-label={menuOpen ? "Cerrar navegación" : "Abrir navegación"}
              aria-expanded={menuOpen}
            >
              <span className="material-symbols-outlined text-2xl">
                {menuOpen ? "close" : "menu"}
              </span>
              <span className="text-sm font-medium">Menu</span>
            </button>
          )}
        </div>

        <div className="hidden md:block">
          {user ? (
            <div className="relative flex items-center gap-3">
              {/* User type toggle for admins and coaches */}
              {(isAdmin || isCoach) && (
                <div className="relative">
                  <button
                    onClick={() => setUserTypeDropdownOpen(!userTypeDropdownOpen)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${isCoach && !isAdmin
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 dark:text-foreground"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                      }`}
                    aria-label="Select user type to view as"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {USER_TYPES.find((t) => t.id === viewAsType)?.icon || "person"}
                    </span>
                    <span className="hidden lg:inline">{USER_TYPES.find((t) => t.id === viewAsType)?.label}</span>
                    <span className="material-symbols-outlined text-sm">
                      {userTypeDropdownOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {userTypeDropdownOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-sage/30 bg-surface shadow-lg">
                      {availableUserTypes.map((type: (typeof USER_TYPES)[number]) => (
                        <button
                          key={type.id}
                          onClick={() => handleTypeChange(type.id)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-desert-sand/20 ${viewAsType === type.id
                            ? "bg-primary/10 text-primary dark:text-foreground"
                            : "text-foreground"
                            } `}
                        >
                          <span className="material-symbols-outlined text-lg">{type.icon}</span>
                          {type.label}
                          {viewAsType === type.id && (
                            <span className="material-symbols-outlined ml-auto text-lg text-primary">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center rounded-lg border border-sage/40 p-2 transition hover:bg-desert-sand/20 ${theme === "dark" ? "text-white" : "text-primary"}`}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                <span className="material-symbols-outlined text-xl">
                  {theme === "light" ? "dark_mode" : "light_mode"}
                </span>
              </button>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-sage/40 bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
              >
                <span className="material-symbols-outlined text-lg">account_circle</span>
                <span>{user.email}</span>
                <span className="material-symbols-outlined text-lg">
                  {dropdownOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-sage/30 bg-surface shadow-lg">
                  {effectiveUserType !== "admin" && effectiveUserType !== "coach" ? (
                    <>
                      <Link
                        href={effectiveUserType === "base" ? "/payment" : "/panel"}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition hover:bg-desert-sand/20 ${effectiveUserType === "base" ? "text-muted-foreground opacity-70" : "text-foreground"
                          } `}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">dashboard</span>
                        Panel
                        {effectiveUserType === "base" && (
                          <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            PRO
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/cursos"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">school</span>
                        Cursos
                      </Link>
                      <Link
                        href="/journal"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">book</span>
                        Diario
                      </Link>
                      <Link
                        href="/meditar"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">self_improvement</span>
                        Meditar
                      </Link>
                    </>
                  ) : effectiveIsCoach ? (
                    <>
                      <Link
                        href="/panelcoach"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">dashboard_customize</span>
                        Panel Coach
                      </Link>
                      <Link
                        href="/adminseguimientos"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">quiz</span>
                        Seguimientos
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/adminusuarios"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                        Admin Usuarios
                      </Link>
                      <Link
                        href="/admincoaches"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">sports</span>
                        Admin Coaches
                      </Link>
                      <Link
                        href="/calendario"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">calendar_month</span>
                        Calendario
                      </Link>
                      <Link
                        href="/adminkiconucontenido"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">space_dashboard</span>
                        Programa Kiconu
                      </Link>
                      <Link
                        href="/adminvideos"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">video_library</span>
                        Admin Videos
                      </Link>
                      <Link
                        href="/admincursos"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">school</span>
                        Admin Cursos
                      </Link>
                      <Link
                        href="/adminmeditaciones"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">self_improvement</span>
                        Admin Meditaciones
                      </Link>
                      <Link
                        href="/marketing"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">campaign</span>
                        Marketing
                      </Link>
                      <Link
                        href="/adminseguimientos"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg">quiz</span>
                        Seguimientos
                      </Link>
                    </>
                  )}
                  <Link
                    href="/cuenta"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="material-symbols-outlined text-lg">person</span>
                    Cuenta
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center rounded-lg border border-sage/40 p-2 text-foreground transition hover:bg-desert-sand/20"
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                <span className="material-symbols-outlined text-xl">
                  {theme === "light" ? "dark_mode" : "light_mode"}
                </span>
              </button>
              <button
                onClick={openLoginModal}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-foreground transition hover:text-primary"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                Iniciar Sesión
              </button>
              <button
                onClick={openRegisterModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
              >
                Registrarse
              </button>
            </div>
          )}
        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
        onShowRegister={() => {
          closeLoginModal();
          openRegisterModal();
        }}
      />
      <RegisterModal isOpen={isRegisterModalOpen} onClose={closeRegisterModal} />

      {menuOpen && (
        <div className="border-t border-sage/30 bg-surface px-6 pb-6 md:hidden">
          <nav className="grid grid-cols-2 gap-x-4 gap-y-2 py-4" aria-label="Mobile navigation">
            {user && (
              <>
                {/* Mobile User Type Selector */}
                {(isAdmin || isCoach) && (
                  <div className="col-span-2 mb-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ver como:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {availableUserTypes.map((type: (typeof USER_TYPES)[number]) => (
                          <button
                            key={type.id}
                            onClick={() => {
                              handleTypeChange(type.id);
                              // Don't close menu immediately to let user see the change
                            }}
                            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${viewAsType === type.id
                              ? "border-primary bg-primary/10 text-primary dark:text-foreground"
                              : "border-sage/40 bg-surface text-muted-foreground hover:bg-desert-sand/10"
                              }`}
                          >
                            <span className="material-symbols-outlined text-lg">{type.icon}</span>
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="my-4 h-px bg-sage/20" />
                  </div>
                )}
                {effectiveUserType !== "admin" && effectiveUserType !== "coach" ? (
                  <>
                    <Link
                      href={effectiveUserType === "base" ? "/payment" : "/panel"}
                      className={`flex items - center gap - 2 rounded - lg border border - sage / 20 bg - surface px - 3 py - 2.5 text - sm font - medium transition - colors hover: border - primary / 30 hover: bg - desert - sand / 10 hover: text - primary ${effectiveUserType === "base" ? "text-muted-foreground opacity-70" : "text-muted-foreground"
                        } `}
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">dashboard</span>
                      Panel
                      {effectiveUserType === "base" && (
                        <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          PRO
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/cursos"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">school</span>
                      Cursos
                    </Link>
                    <Link
                      href="/journal"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">book</span>
                      Diario
                    </Link>
                    <Link
                      href="/meditar"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">self_improvement</span>
                      Meditar
                    </Link>
                  </>
                ) : effectiveIsCoach ? (
                  <>
                    <Link
                      href="/panelcoach"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">dashboard_customize</span>
                      Panel Coach
                    </Link>
                    <Link
                      href="/adminseguimientos"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">quiz</span>
                      Seguimientos
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/adminusuarios"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                      Admin Usuarios
                    </Link>
                    <Link
                      href="/admincoaches"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">sports</span>
                      Admin Coaches
                    </Link>
                    <Link
                      href="/calendario"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">calendar_month</span>
                      Calendario
                    </Link>
                    <Link
                      href="/adminkiconucontenido"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">space_dashboard</span>
                      Programa Kiconu
                    </Link>
                    <Link
                      href="/adminvideos"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">video_library</span>
                      Admin Videos
                    </Link>
                    <Link
                      href="/admincursos"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">school</span>
                      Admin Cursos
                    </Link>
                    <Link
                      href="/adminmeditaciones"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">self_improvement</span>
                      Admin Meditaciones
                    </Link>
                    <Link
                      href="/marketing"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">campaign</span>
                      Marketing
                    </Link>
                    <Link
                      href="/adminseguimientos"
                      className="flex items-center gap-2 rounded-lg border border-sage/20 bg-surface px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-desert-sand/10 hover:text-primary"
                      onClick={closeMenu}
                    >
                      <span className="material-symbols-outlined text-lg">quiz</span>
                      Seguimientos
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {user && (
            <div className="flex flex-col gap-2">
              <Link
                href="/cuenta"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sage/40 bg-surface px-6 py-3 text-base font-semibold text-foreground transition hover:bg-desert-sand/10"
                onClick={closeMenu}
              >
                <span className="material-symbols-outlined text-lg">person</span>
                Cuenta
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  closeMenu();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-600"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

