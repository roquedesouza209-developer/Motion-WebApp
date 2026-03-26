"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import UserAvatar from "@/components/user-avatar";

type AccountType = "public" | "creator";

type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  accountType?: AccountType;
};

type SupportRequestItem = {
  id: string;
  email: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
  timeAgo: string;
  requester: {
    id: string;
    name: string;
    handle: string;
    accountType?: AccountType;
    avatarGradient: string;
    avatarUrl?: string;
  } | null;
};

type SupportInboxPayload = {
  supportRequests: SupportRequestItem[];
  summary: {
    total: number;
    open: number;
    resolved: number;
    fromSignedInUsers: number;
    external: number;
  };
};

type SupportRequestResponse = {
  ok: boolean;
  supportRequest: SupportRequestItem;
};

type SimpleResponse = {
  ok: boolean;
};

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload;
}

function SupportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-white/85 px-4 py-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function SupportRequestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payload, setPayload] = useState<SupportInboxPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [{ user: nextUser }, nextPayload] = await Promise.all([
          apiGet<{ user: User }>("/api/auth/me"),
          apiGet<SupportInboxPayload>("/api/support-requests"),
        ]);

        if (!active) {
          return;
        }

        setUser(nextUser);
        setPayload(nextPayload);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load the support inbox.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const source = payload?.supportRequests ?? [];
    const search = query.trim().toLowerCase();

    if (!search) {
      return source;
    }

    return source.filter((request) => {
      const requesterName = request.requester?.name ?? "";
      const requesterHandle = request.requester?.handle ?? "";

      return (
        request.email.toLowerCase().includes(search) ||
        request.message.toLowerCase().includes(search) ||
        requesterName.toLowerCase().includes(search) ||
        requesterHandle.toLowerCase().includes(search) ||
        request.id.toLowerCase().includes(search)
      );
    });
  }, [payload, query]);

  const recalculateSummary = (supportRequests: SupportRequestItem[]) => ({
    total: supportRequests.length,
    open: supportRequests.filter((request) => request.status === "open").length,
    resolved: supportRequests.filter((request) => request.status === "resolved").length,
    fromSignedInUsers: supportRequests.filter((request) => request.requester != null).length,
    external: supportRequests.filter((request) => request.requester == null).length,
  });

  const replaceRequest = (updatedRequest: SupportRequestItem) => {
    setPayload((current) => {
      if (!current) {
        return current;
      }

      const supportRequests = current.supportRequests.map((request) =>
        request.id === updatedRequest.id ? updatedRequest : request,
      );

      return {
        supportRequests,
        summary: recalculateSummary(supportRequests),
      };
    });
  };

  const removeRequest = (requestId: string) => {
    setPayload((current) => {
      if (!current) {
        return current;
      }

      const supportRequests = current.supportRequests.filter(
        (request) => request.id !== requestId,
      );

      return {
        supportRequests,
        summary: recalculateSummary(supportRequests),
      };
    });
  };

  const updateRequestStatus = async (
    requestId: string,
    status: SupportRequestItem["status"],
  ) => {
    setWorkingId(requestId);
    setActionFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/support-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | (SupportRequestResponse & { error?: string })
        | { error?: string };

      if (!response.ok || !("ok" in payload) || !payload.ok) {
        throw new Error(payload.error ?? "Failed to update support request.");
      }

      replaceRequest(payload.supportRequest);
      setActionFeedback(
        status === "resolved"
          ? "Support request marked as resolved."
          : "Support request reopened.",
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update support request.",
      );
    } finally {
      setWorkingId(null);
    }
  };

  const deleteRequest = async (requestId: string) => {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this support request permanently?");

    if (!confirmed) {
      return;
    }

    setWorkingId(requestId);
    setActionFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/support-requests/${requestId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as
        | (SimpleResponse & { error?: string })
        | { error?: string };

      if (!response.ok || !("ok" in payload) || !payload.ok) {
        throw new Error(payload.error ?? "Failed to delete support request.");
      }

      removeRequest(requestId);
      setActionFeedback("Support request deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete support request.",
      );
    } finally {
      setWorkingId(null);
    }
  };

  const replyByEmail = (request: SupportRequestItem) => {
    const subject = encodeURIComponent(`Re: Motion support request ${request.id}`);
    const greeting = request.requester?.name ? `Hi ${request.requester.name},` : "Hi,";
    const body = encodeURIComponent(`${greeting}\n\nThanks for reaching out to Motion support.\n\n`);
    if (typeof window !== "undefined") {
      window.location.href = `mailto:${request.email}?subject=${subject}&body=${body}`;
    }
  };

  if (loading) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="motion-surface p-6 text-slate-700">Loading support inbox...</div>
        </div>
      </main>
    );
  }

  if (error || !user || !payload) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <Link
            href="/profile"
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Back to Profile
          </Link>
          <section className="motion-surface p-6">
            <p className="text-lg font-semibold text-slate-900">Support inbox unavailable</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error ?? "You need an authenticated creator account to access this page."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="motion-shell min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">
              Internal inbox
            </p>
            <h1
              className="mt-2 text-3xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Support requests
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              A private creator-facing queue for the messages sent from Motion&apos;s support
              widget.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/creator-studio"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Creator Studio
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Back to Profile
            </Link>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <SupportStat label="Open requests" value={String(payload.summary.open)} />
          <SupportStat label="Resolved" value={String(payload.summary.resolved)} />
          <SupportStat label="Total queue" value={String(payload.summary.total)} />
        </section>

        <section className="motion-surface p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Inbox queue</p>
              <p className="mt-1 text-sm text-slate-500">
                Search by email, message text, requester handle, or request id.
              </p>
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search support requests..."
              className="h-11 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-slate-700 transition focus:border-[var(--brand)] focus:outline-none md:max-w-sm"
            />
          </div>
        </section>

        {actionFeedback ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {actionFeedback}
          </section>
        ) : null}

        {error ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </section>
        ) : null}

        {filteredRequests.length === 0 ? (
          <section className="motion-surface p-6">
            <p className="text-base font-semibold text-slate-900">No matching support requests</p>
            <p className="mt-2 text-sm text-slate-600">
              Try a different search, or wait until someone submits a new support message.
            </p>
          </section>
        ) : (
          <section className="grid gap-4">
            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className="motion-surface p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    {request.requester ? (
                      <UserAvatar
                        name={request.requester.name}
                        avatarGradient={request.requester.avatarGradient}
                        avatarUrl={request.requester.avatarUrl}
                        className="h-12 w-12 text-sm font-bold ring-1 ring-[var(--line)]"
                        textClassName="text-sm font-bold text-white"
                        sizes="48px"
                      />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-[var(--line)]">
                        Ext
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">
                          {request.requester?.name ?? request.email}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            request.status === "resolved"
                              ? "border border-slate-200 bg-slate-100 text-slate-600"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span>{request.email}</span>
                        {request.requester ? (
                          <Link
                            href={`/profile?user=${request.requester.handle}`}
                            className="font-medium text-[var(--brand)] hover:underline"
                          >
                            @{request.requester.handle}
                          </Link>
                        ) : (
                          <span>External sender</span>
                        )}
                        <span>{request.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 text-left md:items-end md:text-right">
                    <p className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {request.id}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(request.createdAt))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-[var(--line)] bg-white/75 p-4">
                  <p className="text-sm leading-7 text-slate-700">{request.message}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => replyByEmail(request)}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                    >
                      Reply by email
                    </button>
                    {request.status === "open" ? (
                      <button
                        type="button"
                        onClick={() => void updateRequestStatus(request.id, "resolved")}
                        disabled={workingId === request.id}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {workingId === request.id ? "Working..." : "Mark as resolved"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void updateRequestStatus(request.id, "open")}
                        disabled={workingId === request.id}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60"
                      >
                        {workingId === request.id ? "Working..." : "Reopen"}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void deleteRequest(request.id)}
                    disabled={workingId === request.id}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700 disabled:opacity-60"
                  >
                    {workingId === request.id ? "Working..." : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
