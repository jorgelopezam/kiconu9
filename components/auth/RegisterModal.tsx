"use client";

import { useState, type FormEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await signUpWithEmail(email, password, firstName, lastName);
      onClose();
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to sign in with Google");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 p-6 backdrop-blur-md"
      onClick={handleBackdropClick}
      style={{ isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-md  rounded-2xl bg-surface p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-2xl text-muted-foreground transition hover:bg-desert-sand/30 hover:text-foreground"
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="mb-6 text-2xl font-bold text-foreground">Create Account</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="register-first-name" className="block text-sm font-medium text-foreground">
                First Name
              </label>
              <input
                id="register-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="mt-2 w-full rounded-xl border border-sage/40 bg-desert-sand/30 px-4 py-3 text-base text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-last-name" className="block text-sm font-medium text-foreground">
                Last Name
              </label>
              <input
                id="register-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="mt-2 w-full rounded-xl border border-sage/40 bg-desert-sand/30 px-4 py-3 text-base text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-sage/40 bg-desert-sand/30 px-4 py-3 text-base text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 w-full rounded-xl border border-sage/40 bg-desert-sand/30 px-4 py-3 text-base text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 w-full rounded-xl border border-sage/40 bg-desert-sand/30 px-4 py-3 text-base text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-sage/30" />
          <span className="text-sm text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-sage/30" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-sage/40 bg-surface px-6 py-3 text-base font-semibold text-foreground shadow-sm transition hover:bg-desert-sand/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="size-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign up with Google
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
