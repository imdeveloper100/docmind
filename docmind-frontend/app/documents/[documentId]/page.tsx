"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Send,
  Sparkles,
  User,
  Copy,
  ChevronDown,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import {
  ApiError,
  askQuestion,
  ChatSource,
  DocumentDetail,
  formatTime,
  getChatHistory,
  getDocument,
} from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  text: string;
  time: string;
  sources?: ChatSource[];
};

const WELCOME: Message = {
  role: "assistant",
  text: "I'm ready to help you explore this document. Ask me about key findings, methodology, or any specific detail you want to understand.",
  time: "",
};

function iconClassFor(fileType?: string) {
  if (fileType === "PDF") return "bg-rose-50 text-rose-500";
  if (fileType === "DOCX") return "bg-blue-50 text-blue-500";
  return "bg-amber-50 text-amber-500";
}

function SourceList({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600"
      >
        {sources.length} source{sources.length === 1 ? "" : "s"}
        <ChevronDown
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {sources.map((source, index) => (
            <li
              key={index}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Excerpt {index + 1}</span>
                <span>{Math.round(source.score * 100)}% match</span>
              </div>
              <p className="text-xs leading-5 text-slate-600">{source.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      aria-label="Copy answer"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <Copy className="size-3.5 hover:text-slate-700" />
      )}
    </button>
  );
}

export default function DocumentChatPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [detail, history] = await Promise.all([
          getDocument(documentId, controller.signal),
          getChatHistory(documentId, controller.signal),
        ]);
        if (controller.signal.aborted) return;

        setDoc(detail);
        setMessages([
          WELCOME,
          ...history.flatMap<Message>((entry) => [
            {
              role: "user",
              text: entry.question,
              time: formatTime(entry.createdAt),
            },
            {
              role: "assistant",
              text: entry.answer,
              time: formatTime(entry.createdAt),
            },
          ]),
        ]);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Could not load this document.",
        );
      }
    }

    load();
    return () => controller.abort();
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setInput("");
    setSendError(null);
    setMessages((current) => [
      ...current,
      { role: "user", text: question, time: formatTime(new Date().toISOString()) },
    ]);
    setSending(true);

    try {
      const result = await askQuestion(documentId, question);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: result.answer,
          time: formatTime(new Date().toISOString()),
          sources: result.sources,
        },
      ]);
    } catch (error) {
      setSendError(
        error instanceof ApiError ? error.message : "Could not get an answer.",
      );
    } finally {
      setSending(false);
    }
  }

  const title = doc?.title ?? (loadError ? "Document" : "Loading...");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to documents"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="hidden h-5 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-2">
            <span
              className={`grid size-8 place-items-center rounded-lg ${iconClassFor(doc?.fileType)}`}
            >
              <FileText className="size-4" />
            </span>
            <div>
              <p className="max-w-[190px] truncate text-sm font-semibold text-slate-900 sm:max-w-none">
                {title}
              </p>
              <p className="text-[11px] text-slate-400">
                {doc ? `${doc.chunkCount} indexed sections` : "Document chat"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:flex">
            <Sparkles className="size-3.5 text-indigo-600" />
            AI assistant
          </button>
          <div className="grid size-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            JD
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 sm:px-8">
        <div className="flex items-center justify-between border-b border-slate-200 py-5">
          <div>
            <h1 className="text-lg font-semibold text-slate-950">
              Chat with your document
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Ask questions and get answers grounded in your file.
            </p>
          </div>
        </div>

        {loadError && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Could not open this document
              </p>
              <p className="mt-1 text-xs text-rose-700">{loadError}</p>
              <Link
                href="/"
                className="mt-3 inline-block rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Back to library
              </Link>
            </div>
          </div>
        )}

        <section className="flex flex-1 flex-col gap-6 py-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[90%] gap-3 sm:max-w-[72%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${message.role === "user" ? "bg-slate-200 text-slate-600" : "bg-indigo-600 text-white"}`}
                >
                  {message.role === "user" ? (
                    <User className="size-4" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </div>
                <div>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-tr-sm bg-indigo-600 text-white" : "rounded-tl-sm border border-slate-200 bg-white text-slate-700 shadow-sm"}`}
                  >
                    {message.text}
                  </div>
                  <div
                    className={`mt-2 flex items-center gap-3 text-[11px] text-slate-400 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.time && <span>{message.time}</span>}
                    {message.role === "assistant" && message.text && (
                      <CopyButton text={message.text} />
                    )}
                  </div>
                  {message.sources && <SourceList sources={message.sources} />}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="grid size-8 place-items-center rounded-full bg-indigo-600 text-white">
                <Sparkles className="size-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-indigo-400" />
                  <span className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {sendError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="mt-px size-4 shrink-0" />
              {sendError}
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        <div className="sticky bottom-0 bg-slate-50 pb-5 pt-2">
          <form
            onSubmit={submit}
            className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!loadError}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  submit(e);
                }
              }}
              rows={2}
              placeholder="Ask a question about this document..."
              className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between px-1 pt-2">
              <p className="text-[11px] text-slate-400">
                Press Enter to send · Shift + Enter for a new line
              </p>
              <button
                disabled={!input.trim() || sending || !!loadError}
                className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </div>
          </form>
          <p className="mt-3 text-[11px] text-slate-400">
            Answers are generated from your document
          </p>
        </div>
      </main>
    </div>
  );
}
