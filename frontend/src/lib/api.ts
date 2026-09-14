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

// Accounts are wallet-native: email is nullable (zkLogin accounts have none),
// suiAddress is what actually identifies the account. username is null only
// for the brief moment between a brand-new account's first login and the
// forced onboarding step that assigns one — see AuthContext/OnboardingGate.
export interface UserResponse { id: number; username: string | null; email: string | null; role: Role; suiAddress: string | null; }
export interface LoginResponse extends UserResponse { token: string; }

export interface WalletChallengeResponse { nonce: string; message: string; expiresAt: string; }

export interface UsernameAvailabilityResponse { available: boolean; reason: string | null; }

export interface TeamResponse { id: number; name: string; createdBy: number; createdAt: string; yourRole: TeamRole; }
export interface TeamMemberResponse { userId: number; username: string | null; email: string | null; suiAddress: string | null; teamRole: TeamRole; }

export interface DocumentResponse {
  id: number; filename: string; contentType: string;
  status: string; version: number;
  rootDocumentId: number; documentHash: string;
  ownerId: number; teamId: number;
  policyHash: string | null; envelopeHash: string | null;
  expiry: string | null; onchainObjectId: string | null;
  onchainPackageId: string | null; onchainNetwork: string | null;
  onchainTxDigest: string | null; createdAt: string;
}
export interface AuditLogResponse { id: number; documentId: number; action: string; performedBy: number; timestamp: string; detail: string | null; }
export interface VerifyResponse { documentId: number; verified: boolean; result: string; }
export interface SignatureResponse { signerId: number; username: string | null; email: string | null; suiAddress: string | null; signed: boolean; signedAt: string | null; }


export async function recordOnchainRegistration(
    documentId: number,
    objectId: string,
    txDigest: string,
    packageId: string,
    network: string,
): Promise<DocumentResponse> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/onchain-registration`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ objectId, txDigest, packageId, network }),
  });
  return handleResponse<DocumentResponse>(res);
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

// --- wallet-native auth ---
// There is no password path. Logging in and creating an account are the same
// action: prove control of a Sui address over a fresh, single-use nonce.
export async function getWalletChallenge(): Promise<WalletChallengeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/wallet/challenge`, { method: "POST" });
  return handleResponse<WalletChallengeResponse>(res);
}

export async function verifyWalletSignature(
    nonce: string, address: string, signature: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/wallet/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonce, address, signature }),
  });
  return handleResponse<LoginResponse>(res);
}

export async function getMe(): Promise<UserResponse> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, { headers: { ...authHeaders() } });
  return handleResponse<UserResponse>(res);
}

// --- usernames ---
// Off-chain only: a username never appears in a Sui transaction or the Move
// package. On-chain identity stays the address; this is purely a
// human-friendly, unique handle layered on top for display and invites.
export async function checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/users/username-availability?username=${encodeURIComponent(username)}`,
    { headers: { ...authHeaders() } },
  );
  return handleResponse<UsernameAvailabilityResponse>(res);
}
export async function setUsername(username: string): Promise<UserResponse> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/username`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ username }),
  });
  return handleResponse<UserResponse>(res);
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
// `identifier` is a username, an email, or a 0x-prefixed Sui address — the
// backend decides which by shape. Username is the primary invite path since
// zkLogin accounts have no email at all.
export async function addMember(teamId: number, identifier: string, teamRole: TeamRole): Promise<TeamMemberResponse> {
  const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ identifier, teamRole }),
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
// On-chain signing: the caller signs a Move sign() transaction with their wallet,
// then reports the resulting tx digest + signer address so the backend records it.
export async function signDocument(id: number, txDigest: string, signerAddress: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ txDigest, signerAddress }),
  });
  return handleNoContent(res);
}

// --- documents (across every team the caller belongs to) ---
export async function listAllDocuments(): Promise<DocumentResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents`, { headers: { ...authHeaders() } });
  return handleResponse<DocumentResponse[]>(res);
}

// --- admin ---
// The only way an account's global role is ever changed after its first wallet
// login. Backend rejects the call unless the JWT itself carries the ADMIN role.
export async function updateUserRole(userId: number, role: Role): Promise<UserResponse> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  return handleResponse<UserResponse>(res);
}