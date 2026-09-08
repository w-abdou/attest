const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type Role = "ADMIN" | "SIGNER" | "VIEWER";
export type TeamRole = "TEAM_ADMIN" | "TEAM_SIGNER" | "TEAM_VIEWER";

export interface UserResponse { id: number; email: string; role: Role; }
export interface LoginResponse extends UserResponse { token: string; }

export interface TeamResponse { id: number; name: string; createdBy: number; createdAt: string; yourRole: TeamRole; }
export interface TeamMemberResponse { userId: number; email: string; teamRole: TeamRole; }

export interface DocumentResponse {
  id: number; filename: string; contentType: string; status: string;
  version: number; rootDocumentId: number; documentHash: string;
  ownerId: number; teamId: number; createdAt: string;
}
export interface AuditLogResponse { id: number; documentId: number; action: string; performedBy: number; timestamp: string; detail: string | null; }
export interface VerifyResponse { documentId: number; verified: boolean; result: string; }
export interface SignatureResponse { signerId: number; email: string; signed: boolean; signedAt: string | null; }

async function handleResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    const message = body?.error || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

async function handleNoContent(res: Response): Promise<void> {
  if (!res.ok) {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await res.json() : null;
    throw new ApiError(body?.error || `Request failed with status ${res.status}`, res.status);
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("attest_token");
}
function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- auth ---
export async function register(email: string, password: string): Promise<UserResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: "VIEWER" }),
  });
  return handleResponse<UserResponse>(res);
}
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

// --- teams ---
export async function listTeams(): Promise<TeamResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/teams`, { headers: { ...authHeaders() } });
  return handleResponse<TeamResponse[]>(res);
}
export async function createTeam(name: string): Promise<TeamResponse> {
  const res = await fetch(`${API_BASE_URL}/api/teams`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  return handleResponse<TeamResponse>(res);
}
export async function listMembers(teamId: number): Promise<TeamMemberResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, { headers: { ...authHeaders() } });
  return handleResponse<TeamMemberResponse[]>(res);
}
export async function addMember(teamId: number, email: string, teamRole: TeamRole): Promise<TeamMemberResponse> {
  const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email, teamRole }),
  });
  return handleResponse<TeamMemberResponse>(res);
}
export async function updateMemberRole(teamId: number, userId: number, teamRole: TeamRole): Promise<TeamMemberResponse> {
  const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members/${userId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ teamRole }),
  });
  return handleResponse<TeamMemberResponse>(res);
}
export async function removeMember(teamId: number, userId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members/${userId}`, {
    method: "DELETE", headers: { ...authHeaders() },
  });
  return handleNoContent(res);
}

// --- documents (team-scoped) ---
export async function listTeamDocuments(teamId: number): Promise<DocumentResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents/team/${teamId}`, { headers: { ...authHeaders() } });
  return handleResponse<DocumentResponse[]>(res);
}
export async function uploadToTeam(teamId: number, file: File): Promise<DocumentResponse> {
  const formData = new FormData(); formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/documents/team/${teamId}`, {
    method: "POST", headers: { ...authHeaders() }, body: formData,
  });
  return handleResponse<DocumentResponse>(res);
}
export async function getDocument(id: number): Promise<DocumentResponse> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, { headers: { ...authHeaders() } });
  return handleResponse<DocumentResponse>(res);
}
export async function getVersions(id: number): Promise<DocumentResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/versions`, { headers: { ...authHeaders() } });
  return handleResponse<DocumentResponse[]>(res);
}
export async function getAuditTrail(id: number): Promise<AuditLogResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/audit`, { headers: { ...authHeaders() } });
  return handleResponse<AuditLogResponse[]>(res);
}
export async function verifyDocument(id: number, file: File): Promise<VerifyResponse> {
  const formData = new FormData(); formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/verify`, {
    method: "POST", headers: { ...authHeaders() }, body: formData,
  });
  return handleResponse<VerifyResponse>(res);
}
export async function amendDocument(id: number, file: File): Promise<DocumentResponse> {
  const formData = new FormData(); formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/amend`, {
    method: "POST", headers: { ...authHeaders() }, body: formData,
  });
  return handleResponse<DocumentResponse>(res);
}
export async function getSigners(id: number): Promise<SignatureResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/signers`, { headers: { ...authHeaders() } });
  return handleResponse<SignatureResponse[]>(res);
}
export async function assignSigners(id: number, signerUserIds: number[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/signers`, {
    method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ signerUserIds }),
  });
  return handleNoContent(res);
}
export async function signDocument(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/sign`, {
    method: "POST", headers: { ...authHeaders() },
  });
  return handleNoContent(res);
}

// --- documents (across every team the caller belongs to) ---
export async function listAllDocuments(): Promise<DocumentResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents`, { headers: { ...authHeaders() } });
  return handleResponse<DocumentResponse[]>(res);
}

// --- admin ---
// The only way a SIGNER or ADMIN account is ever created. Backend rejects the
// call unless the JWT itself carries the ADMIN role.
export async function updateUserRole(userId: number, role: Role): Promise<UserResponse> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  return handleResponse<UserResponse>(res);
}
