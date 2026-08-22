export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type DocumentSummary = {
  id: string;
  title: string;
  fileType: string;
  sizeBytes: number;
  createdAt: string;
};

export type DocumentDetail = DocumentSummary & {
  chunkCount: number;
};

export type ChatSource = {
  text: string;
  score: number;
};

export type ChatAnswer = {
  answer: string;
  sources: ChatSource[];
};

export type ChatHistoryEntry = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(response: Response) {
  let message = `Request failed with status ${response.status}`;
  try {
    const body = await response.json();
    // Nest sends `message` as either a string or an array of validation errors.
    if (Array.isArray(body?.message)) {
      message = body.message.join(", ");
    } else if (typeof body?.message === "string") {
      message = body.message;
    }
  } catch {
    // Response had no JSON body; keep the status-based message.
  }
  return new ApiError(message, response.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(
      `Cannot reach the DocMind API at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response.json() as Promise<T>;
}

export function listDocuments(signal?: AbortSignal) {
  return request<DocumentSummary[]>("/documents", { signal });
}

export function getDocument(id: string, signal?: AbortSignal) {
  return request<DocumentDetail>(`/documents/${id}`, { signal });
}

export function uploadDocument(file: File) {
  const body = new FormData();
  body.append("file", file);
  body.append("title", file.name);
  return request<DocumentDetail>("/documents/upload", { method: "POST", body });
}

export function deleteDocument(id: string) {
  return request<{ id: string; deleted: boolean }>(`/documents/${id}`, {
    method: "DELETE",
  });
}

export type RecentChat = {
  documentId: string;
  documentTitle: string;
  fileType: string;
  lastQuestion: string;
  lastMessageAt: string;
  messageCount: number;
};

export function listRecentChats(signal?: AbortSignal) {
  return request<RecentChat[]>("/chat/recent", { signal });
}

export function askQuestion(documentId: string, question: string) {
  return request<ChatAnswer>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, question }),
  });
}

export function getChatHistory(documentId: string, signal?: AbortSignal) {
  return request<ChatHistoryEntry[]>(`/chat/${documentId}/history`, { signal });
}

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isAcceptedFile(file: File) {
  return ACCEPTED_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "Recently added";

  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Added just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60)
    return `Added ${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Added ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Added yesterday";
  if (days < 30) return `Added ${days} days ago`;

  return `Added ${new Date(iso).toLocaleDateString()}`;
}

export function formatAgo(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "Recently";

  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;

  return new Date(iso).toLocaleDateString();
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
