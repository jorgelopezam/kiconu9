"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { LogoMark } from "../common/LogoMark";
import { LoginModal } from "../auth/LoginModal";
import { RegisterModal } from "../auth/RegisterModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

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

  return (
    <header className="sticky top-0 z-50 border-b border-sage/20 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <Link href={user ? "/panel" : "/"}>
          <LogoMark className="text-primary" textClassName="text-foreground" />
        </Link>

        <button
          type="button"
          onClick={toggleMenu}
          className="flex size-10 items-center justify-center rounded-lg border border-sage/40 text-2xl text-primary transition md:hidden"
          aria-label={menuOpen ? "Cerrar navegación" : "Abrir navegación"}
          aria-expanded={menuOpen}
        >
          <span className="material-symbols-outlined">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>

        <div className="hidden md:block">
          {user ? (
            <div className="relative flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center rounded-lg border border-sage/40 p-2 text-primary transition hover:bg-desert-sand/20"
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
                  <Link
                    href="/panel"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="material-symbols-outlined text-lg">dashboard</span>
                    Panel
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
                  <Link
                    href="/videos"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="material-symbols-outlined text-lg">play_circle</span>
                    Videos
                  </Link>
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    Admin
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
                    href="/marketing"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="material-symbols-outlined text-lg">campaign</span>
                    Marketing
                  </Link>
                  <Link
                    href="/videoadmin"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="material-symbols-outlined text-lg">video_library</span>
                    Video Admin
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
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-foreground transition hover:text-primary"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                Iniciar Sesión
              </button>
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
              >
                Registrarse
              </button>
            </div>
          )}
        </div>
      </div>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <RegisterModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} />

      {menuOpen && (
        <div className="border-t border-sage/30 bg-surface px-6 pb-6 md:hidden">
          <nav className="flex flex-col gap-4 py-4" aria-label="Mobile navigation">
            {user && (
              <>
                <Link
                  href="/panel"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Panel
                </Link>
                <Link
                  href="/journal"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Diario
                </Link>
                <Link
                  href="/meditar"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Meditar
                </Link>
                <Link
                  href="/videos"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Videos
                </Link>
                <Link
                  href="/admin"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Admin
                </Link>
                <Link
                  href="/calendario"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Calendario
                </Link>
                <Link
                  href="/marketing"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Marketing
                </Link>
                <Link
                  href="/videoadmin"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={closeMenu}
                >
                  Video Admin
                </Link>
              </>
            )}
          </nav>
          
          {/* Theme toggle button for mobile */}
          <button
            onClick={toggleTheme}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sage/40 bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
          >
            <span className="material-symbols-outlined text-lg">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
            {theme === "light" ? "Modo Oscuro" : "Modo Claro"}
          </button>
          
          {user ? (
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
          ) : (
            <>
              <button
                onClick={() => {
                  setLoginModalOpen(true);
                  closeMenu();
                }}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sage/40 bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                Iniciar Sesión
              </button>
              <button
                onClick={() => {
                  setRegisterModalOpen(true);
                  closeMenu();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-600"
              >
                Registrarse
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
