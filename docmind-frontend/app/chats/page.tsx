"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronRight,
  Clock3,
  FileText,
  Menu,
  MessageSquare,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import {
  ApiError,
  formatAgo,
  listDocuments,
  listRecentChats,
  RecentChat,
} from "@/lib/api";

function iconClassFor(fileType: string) {
  if (fileType === "PDF") return "bg-rose-50 text-rose-500";
  if (fileType === "DOCX") return "bg-blue-50 text-blue-500";
  return "bg-amber-50 text-amber-500";
}

function ChatRowSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <div className="size-10 rounded-lg bg-slate-100" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function RecentChatsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [recent, documents] = await Promise.all([
        listRecentChats(signal),
        listDocuments(signal),
      ]);
      if (signal?.aborted) return;
      setChats(recent);
      setDocumentCount(documents.length);
      setLoadError(null);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(
        error instanceof ApiError ? error.message : "Could not load chats.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          documentCount={documentCount}
        />
        <main className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <button
              className="rounded-lg p-2 hover:bg-slate-50 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden text-sm text-slate-500 lg:block">
              Workspace /{" "}
              <span className="font-medium text-slate-900">Recent Chats</span>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden size-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 sm:grid">
                JD
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
            <div>
              <p className="mb-2 text-sm font-medium text-indigo-600">
                Your conversations
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Recent Chats
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Continue asking questions about documents you have already
                opened.
              </p>
            </div>

            {loadError && (
              <div className="mt-8 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-900">
                    Could not load recent chats
                  </p>
                  <p className="mt-1 text-xs text-rose-700">{loadError}</p>
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    refresh();
                  }}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="mt-8 space-y-3">
              {loading ? (
                <>
                  <ChatRowSkeleton />
                  <ChatRowSkeleton />
                  <ChatRowSkeleton />
                </>
              ) : (
                chats.map((chat) => (
                  <Link
                    key={chat.documentId}
                    href={`/documents/${chat.documentId}`}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div
                      className={`grid size-10 shrink-0 place-items-center rounded-lg ${iconClassFor(chat.fileType)}`}
                    >
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="truncate text-sm font-semibold text-slate-900">
                          {chat.documentTitle}
                        </h2>
                        <p className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
                          <Clock3 className="size-3.5" />
                          {formatAgo(chat.lastMessageAt)}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {chat.lastQuestion}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {chat.messageCount} message
                        {chat.messageCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-slate-300" />
                  </Link>
                ))
              )}
            </div>

            {!loading && !loadError && chats.length === 0 && (
              <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                  <MessageSquare className="size-6" />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  No chats yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Open a document and ask a question to see it here.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Go to documents
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
