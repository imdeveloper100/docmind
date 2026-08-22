"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function DeleteDocumentModal({
  filename,
  open,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  filename: string;
  open: boolean;
  deleting: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/40"
        onClick={deleting ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-doc-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="delete-doc-title"
          className="text-lg font-semibold tracking-tight text-slate-950"
        >
          Are you sure you want to delete this file &ldquo;{filename}&rdquo;?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This will remove the file, its embeddings, and any chats about it.
          This cannot be undone.
        </p>
        {error && (
          <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
