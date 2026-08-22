"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  X,
} from "lucide-react";

function navClass(active: boolean) {
  return active
    ? "flex items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2.5 text-indigo-700"
    : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-slate-50";
}

export function Sidebar({
  open,
  onClose,
  documentCount,
}: {
  open: boolean;
  onClose: () => void;
  documentCount: number;
}) {
  const pathname = usePathname();
  const documentsActive = pathname === "/";
  const chatsActive = pathname === "/chats" || pathname.startsWith("/chats/");
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
          <Link className={navClass(documentsActive)} href="/">
            <FileText className="size-[18px]" />
            My Documents
          </Link>
          <Link className={navClass(chatsActive)} href="/chats">
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
