const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export type Role = "ADMIN" | "SIGNER" | "VIEWER";

export interface UserResponse {
    id: number;
    email: string;
    role: Role;
}

export interface LoginResponse extends UserResponse {
    token: string;
}

export interface DocumentResponse {
    id: number;
    filename: string;
    contentType: string;
    status: string;
    version: number;
    rootDocumentId: number;
    documentHash: string;
    ownerId: number;
    createdAt: string;
}

export interface AuditLogResponse {
    id: number;
    documentId: number;
    action: string;
    performedBy: number;
    timestamp: string;
    detail: string | null;
}

export interface VerifyResponse {
    documentId: number;
    verified: boolean;
    result: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await res.json() : null;

    if (!res.ok) {
        const message = body?.error || `Request failed with status ${res.status}`;
        throw new ApiError(message, res.status);
    }

    return body as T;
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("attest_token");
}

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register(email: string, password: string): Promise<UserResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "VIEWER" }),
    });
    return handleResponse<UserResponse>(res);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse<LoginResponse>(res);
}

export async function updateUserRole(userId: number, role: Role): Promise<UserResponse> {
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ role }),
    });
    return handleResponse<UserResponse>(res);
}

export async function listDocuments(): Promise<DocumentResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents`, {
        headers: { ...authHeaders() },
    });
    return handleResponse<DocumentResponse[]>(res);
}

export async function getDocument(id: number): Promise<DocumentResponse> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        headers: { ...authHeaders() },
    });
    return handleResponse<DocumentResponse>(res);
}

export async function getVersions(id: number): Promise<DocumentResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}/versions`, {
        headers: { ...authHeaders() },
    });
    return handleResponse<DocumentResponse[]>(res);
}

export async function getAuditTrail(id: number): Promise<AuditLogResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}/audit`, {
        headers: { ...authHeaders() },
    });
    return handleResponse<AuditLogResponse[]>(res);
}

// Note: no "Content-Type" header is set on these two — the browser sets
// multipart/form-data with the correct boundary automatically when you pass
// a FormData body to fetch. Setting it manually breaks the upload.

export async function uploadDocument(file: File): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/documents`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: formData,
    });
    return handleResponse<DocumentResponse>(res);
}

export async function verifyDocument(id: number, file: File): Promise<VerifyResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}/verify`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: formData,
    });
    return handleResponse<VerifyResponse>(res);
}

export async function amendDocument(id: number, file: File): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}/amend`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: formData,
    });
    return handleResponse<DocumentResponse>(res);
}