"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Upload,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  Clock3,
  FileUp,
  ChevronRight,
  Menu,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  ACCEPTED_EXTENSIONS,
  ApiError,
  DocumentSummary,
  formatBytes,
  formatRelativeTime,
  isAcceptedFile,
  listDocuments,
  MAX_UPLOAD_BYTES,
  uploadDocument,
} from "@/lib/api";

function iconClassFor(fileType: string) {
  if (fileType === "PDF") return "bg-rose-50 text-rose-500";
  if (fileType === "DOCX") return "bg-blue-50 text-blue-500";
  return "bg-amber-50 text-amber-500";
}

function Sidebar({
  open,
  onClose,
  documentCount,
}: {
  open: boolean;
  onClose: () => void;
  documentCount: number;
}) {
  const used = Math.min(documentCount, 5);
  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
              <FileText className="size-[18px]" />
            </span>
            DocMind<span className="text-indigo-600">AI</span>
          </Link>
          <button
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-5 text-slate-500" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4 text-sm font-medium">
          <Link
            className="flex items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2.5 text-indigo-700"
            href="/"
          >
            <FileText className="size-[18px]" />
            My Documents
          </Link>
          <Link
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-slate-50"
            href="/"
          >
            <MessageSquare className="size-[18px]" />
            Recent Chats
          </Link>
        </nav>
        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Sparkles className="size-4 text-indigo-600" />
              Free plan
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {documentCount} of 5 documents used
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${(used / 5) * 100}%` }}
              />
            </div>
            <button className="mt-3 w-full rounded-md bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
              Upgrade plan
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3 px-1">
            <div className="grid size-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              JD
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                Jordan Davis
              </p>
              <p className="truncate text-[11px] text-slate-500">
                jordan@example.com
              </p>
            </div>
            <MoreHorizontal className="size-4 text-slate-400" />
          </div>
        </div>
      </aside>
    </>
  );
}

function DocumentCard({ doc }: { doc: DocumentSummary }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div>
        <div className="flex items-start justify-between">
          <div
            className={`grid size-10 place-items-center rounded-lg ${iconClassFor(doc.fileType)}`}
          >
            <FileText className="size-5" />
          </div>
          <button
            aria-label={`More options for ${doc.title}`}
            onClick={(e) => e.preventDefault()}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>
        <h3 className="mt-4 truncate text-sm font-semibold text-slate-900">
          {doc.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {doc.fileType} · {formatBytes(doc.sizeBytes)}
        </p>
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
        <Clock3 className="size-3.5" />
        {formatRelativeTime(doc.createdAt)}
      </p>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="min-h-[178px] animate-pulse rounded-xl border border-slate-200 bg-white p-4">
      <div className="size-10 rounded-lg bg-slate-100" />
      <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
      <div className="mt-8 h-3 w-2/5 rounded bg-slate-100" />
    </div>
  );
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await listDocuments(signal);
      if (signal?.aborted) return;
      setDocs(data);
      setLoadError(null);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(
        error instanceof ApiError ? error.message : "Could not load documents.",
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

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setUploadedName(null);
    setUploadError(null);

    if (!isAcceptedFile(file)) {
      setUploadError(
        `"${file.name}" is not supported. Choose a PDF, DOCX, or TXT file.`,
      );
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(
        `"${file.name}" is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      );
      return;
    }

    setUploading(true);
    try {
      const created = await uploadDocument(file);
      setUploadedName(created.title);
      await refresh();
    } catch (error) {
      setUploadError(
        error instanceof ApiError ? error.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  const filtered = useMemo(
    () =>
      docs.filter((doc) =>
        doc.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [docs, query],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <input
        ref={fileInputRef}
        id="file-upload"
        className="sr-only"
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex min-h-screen">
        <Sidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          documentCount={docs.length}
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
              <span className="font-medium text-slate-900">My Documents</span>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <button
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Notifications"
              >
                <span className="absolute right-2 top-1 size-1.5 rounded-full bg-indigo-600" />
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
              </button>
              <div className="hidden size-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 sm:grid">
                JD
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                  Your knowledge workspace
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  My Documents
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Upload documents and chat with your files using AI.
                </p>
              </div>
              <button
                onClick={openFilePicker}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {uploading ? "Uploading..." : "Upload document"}
              </button>
            </div>

            <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <FileUp className="size-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Add a document to get started
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Upload a PDF, DOCX, or TXT file up to{" "}
                    {formatBytes(MAX_UPLOAD_BYTES)}. DocMind will analyze it so
                    you can ask questions.
                  </p>
                </div>
                <button
                  onClick={openFilePicker}
                  disabled={uploading}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="size-4" />
                  Choose file
                </button>
              </div>

              {uploading && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-indigo-700">
                  <Loader2 className="size-4 animate-spin" />
                  Extracting text and building embeddings. This can take a
                  moment for large files.
                </div>
              )}
              {uploadedName && !uploading && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  &ldquo;{uploadedName}&rdquo; is ready. Open it to start
                  asking questions.
                </div>
              )}
              {uploadError && (
                <div className="mt-3 flex items-start gap-2 text-xs font-medium text-rose-700">
                  <AlertCircle className="mt-px size-4 shrink-0" />
                  {uploadError}
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Your library{" "}
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    {loading ? "" : docs.length}
                  </span>
                </h2>
              </div>
              <div className="flex gap-2">
                <label className="relative block flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none ring-indigo-500 placeholder:text-slate-400 focus:ring-2"
                  />
                </label>
                <button
                  onClick={openFilePicker}
                  disabled={uploading}
                  className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                  aria-label="Add document"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {loadError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-900">
                    Could not load your library
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

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {loading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                filtered.map((doc) => <DocumentCard key={doc.id} doc={doc} />)
              )}
              {!loading && (
                <button
                  onClick={openFilePicker}
                  disabled={uploading}
                  className="flex min-h-[178px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30 disabled:opacity-60"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                    {uploading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Plus className="size-5" />
                    )}
                  </span>
                  <span className="mt-3 text-sm font-semibold text-slate-700">
                    Add document
                  </span>
                  <span className="mt-1 text-xs text-slate-400">
                    PDF, DOCX, or TXT
                  </span>
                </button>
              )}
            </div>

            {!loading && !loadError && docs.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">
                Your library is empty. Upload your first document to get
                started.
              </div>
            )}
            {!loading && docs.length > 0 && filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-500">
                No documents match &ldquo;{query}&rdquo;.
              </div>
            )}

            <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-400">
              <span>DocMind AI · Secure document intelligence</span>
              <Link href="/" className="hover:text-indigo-600">
                Help center <ChevronRight className="ml-1 inline size-3" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
