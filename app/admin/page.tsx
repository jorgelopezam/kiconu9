"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, getUserProfile } from "@/lib/firestore-helpers";
import type { User as FirestoreUser } from "@/lib/firestore-schema";

const PASSWORD_PLACEHOLDER = "********";

type DetailRowProps = {
  label: string;
  value: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

function DetailRow({ label, value, actionLabel, onAction }: DetailRowProps) {
  return (
    <div className="grid grid-cols-1 gap-y-2 border-t border-panel-border py-4 md:grid-cols-[160px_1fr_auto] md:items-center">
      <span className="text-sm font-medium text-panel-muted">{label}</span>
      <div className="text-sm text-panel-text">{value}</div>
      {actionLabel ? (
        <div className="flex justify-start md:justify-end">
          <button
            onClick={onAction}
            className="rounded-lg px-3 py-1 text-sm font-semibold text-panel-primary transition hover:bg-panel-primary/10"
          >
            {actionLabel}
          </button>
        </div>
      ) : (
        <div className="hidden md:block" aria-hidden="true" />
      )}
    </div>
  );
}

function formatUserType(userType: FirestoreUser["user_type"]): string {
  if (!userType) {
    return "Not selected";
  }

  switch (userType) {
    case "base":
      return "Base";
    case "kiconu":
      return "Kiconu";
    case "premium":
      return "Premium";
    case "admin":
      return "Admin";
    default:
      return userType;
  }
}

function formatGender(gender: FirestoreUser["gender"]): string {
  if (!gender) {
    return "Not provided";
  }

  return gender
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatWeight(weight: FirestoreUser["weight"]): string {
  if (weight === undefined || weight === null) {
    return "Not provided";
  }

  return `${weight} kg`;
}

function formatAge(age: FirestoreUser["age"]): string {
  if (age === undefined || age === null) {
    return "Not provided";
  }

  return `${age} years`;
}

function formatDate(date: FirestoreUser["registration_date"]): string {
  if (!date) {
    return "Not available";
  }

  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date instanceof Date ? date : new Date(date));
  } catch (error) {
    return "Not available";
  }
}

function getInitials(firstName?: string, lastName?: string, fallback?: string): string {
  const candidates = [firstName, lastName].filter(Boolean) as string[];

  if (candidates.length === 0) {
    return fallback?.charAt(0).toUpperCase() || "K";
  }

  const initials = candidates
    .map((name) => name.trim().charAt(0).toUpperCase())
    .join("");

  return initials.slice(0, 2);
}

function UserCard({ user }: { user: FirestoreUser }) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Name unavailable";
  const initials = getInitials(user.first_name, user.last_name, user.email);

  return (
    <article className="rounded-2xl border border-panel-border bg-panel-card shadow-lg">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-panel-primary/15 text-xl font-semibold text-panel-primary">
              {initials}
            </div>
            <div>
              <p className="text-xl font-semibold text-panel-text">{fullName}</p>
              <p className="text-sm text-panel-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <span className="inline-flex items-center justify-center rounded-full bg-panel-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-panel-primary">
              {formatUserType(user.user_type)}
            </span>
            {user.is_admin && (
              <span className="inline-flex items-center justify-center rounded-full border border-panel-primary/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-panel-primary">
                Admin Access
              </span>
            )}
            <span className="text-xs text-panel-muted">
              Joined {formatDate(user.registration_date)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-panel-border bg-panel-bg/60">
          <DetailRow label="Email" value={user.email || "Not provided"} />
          <DetailRow
            label="Password"
            value={
              <div className="flex flex-col">
                <span className="font-semibold tracking-[0.4em] text-panel-text/80">{PASSWORD_PLACEHOLDER}</span>
                <span className="text-xs text-panel-muted">Credentials managed through Firebase Authentication</span>
              </div>
            }
          />
          <DetailRow label="First Name" value={user.first_name || "Not provided"} />
          <DetailRow label="Last Name" value={user.last_name || "Not provided"} />
          <DetailRow label="User Type" value={formatUserType(user.user_type)} />
          <DetailRow label="Age" value={formatAge(user.age)} />
          <DetailRow label="Weight" value={formatWeight(user.weight)} />
          <DetailRow label="Gender" value={formatGender(user.gender)} />
        </div>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [usersList, setUsersList] = useState<FirestoreUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<FirestoreUser | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }

    let isMounted = true;

    const initialise = async () => {
      try {
        const profile = await getUserProfile(user.uid);

        if (!profile || !profile.is_admin) {
          router.push("/panel");
          return;
        }

        if (!isMounted) {
          return;
        }

        setAdminProfile(profile);

        const fetchedUsers = await getAllUsers();

        if (!isMounted) {
          return;
        }

        // Sort newest first to surface the latest registrations
        const sortedUsers = fetchedUsers
          .slice()
          .sort((a, b) => {
            const aTime = a.registration_date instanceof Date ? a.registration_date.getTime() : 0;
            const bTime = b.registration_date instanceof Date ? b.registration_date.getTime() : 0;
            return bTime - aTime;
          });

        setUsersList(sortedUsers);
      } catch (err) {
        console.error("Error loading admin data:", err);
        if (isMounted) {
          setError("Unable to load users. Please try again.");
        }
      } finally {
        if (isMounted) {
          setUsersLoading(false);
        }
      }
    };

    initialise();

    return () => {
      isMounted = false;
    };
  }, [user, loading, router]);

  if (loading || usersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel-bg">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-panel-primary border-t-transparent"></div>
          <p className="text-sm text-panel-muted">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel-bg">
        <div className="rounded-2xl border border-panel-border bg-panel-card p-8 text-center shadow-lg">
          <p className="mb-2 text-lg font-semibold text-panel-text">Something went wrong</p>
          <p className="text-sm text-panel-muted">{error}</p>
        </div>
      </div>
    );
  }

  const adminFullName = adminProfile
    ? [adminProfile.first_name, adminProfile.last_name].filter(Boolean).join(" ")
    : "Administrator";

  return (
    <div className="min-h-screen bg-panel-bg py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4">
        <section className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-lg">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-panel-primary/20 text-xl font-semibold text-panel-primary">
                {getInitials(adminProfile?.first_name, adminProfile?.last_name, user.email)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-panel-text">{adminFullName || user.email}</h1>
                <p className="text-sm text-panel-muted">{user.email}</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <span className="rounded-xl border border-panel-border px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-panel-muted">
                Admin Dashboard
              </span>
              <span className="rounded-xl bg-panel-primary px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-panel-text-light">
                {usersList.length} users
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-lg">
          <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-panel-text">Users Directory</h2>
              <p className="text-sm text-panel-muted">Overview of every profile in the platform</p>
            </div>
          </header>

          {usersList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-panel-border/60 bg-panel-bg/40 p-8 text-center text-sm text-panel-muted">
              No users found yet. Invited members will appear here once they create an account.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {usersList.map((entry) => (
                <UserCard key={entry.user_id} user={entry} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
