import { NextRequest, NextResponse } from "next/server";
import { EnokiClient } from "@mysten/enoki";
import { ATTEST_NETWORK, TARGET } from "@/lib/attestContract";

// Runs server-side in Node, never in the browser — this is the one place
// ENOKI_SECRET_KEY (a real API credential, distinct from the
// NEXT_PUBLIC_ENOKI_API_KEY used client-side for zkLogin) is ever read. It
// must never be prefixed NEXT_PUBLIC_ and must never be committed. See
// docs/security-assessment.md "Sponsored transactions" for the required
// Enoki Portal setup (allowed move-call targets) this depends on.
export const runtime = "nodejs";

const ENOKI_SECRET_KEY = process.env.ENOKI_SECRET_KEY;

// The client names an action, never a raw Move target — this is what stops
// a compromised or malicious browser from asking this app's Enoki sponsor
// pool to pay gas for some unrelated call. Keep in sync with
// lib/sponsoredTransaction.ts's SponsoredAction type.
const SPONSORABLE_TARGETS: Record<string, string> = {
  "register-document": TARGET.registerDocument,
  "sign": TARGET.sign,
};

interface SponsorRequestBody {
  transactionKindBytes?: string;
  sender?: string;
  action?: string;
}

export async function POST(req: NextRequest) {
  if (!ENOKI_SECRET_KEY) {
    return NextResponse.json(
      { error: "Sponsored transactions are not configured on this server (ENOKI_SECRET_KEY is not set)." },
      { status: 501 },
    );
  }

  let body: SponsorRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const { transactionKindBytes, sender, action } = body;
  if (!transactionKindBytes || !sender || !action) {
    return NextResponse.json(
      { error: "transactionKindBytes, sender, and action are all required" },
      { status: 400 },
    );
  }

  const target = SPONSORABLE_TARGETS[action];
  if (!target) {
    return NextResponse.json({ error: `Unknown sponsored action: ${action}` }, { status: 400 });
  }

  const enokiClient = new EnokiClient({ apiKey: ENOKI_SECRET_KEY });
  try {
    const { bytes, digest } = await enokiClient.createSponsoredTransaction({
      network: ATTEST_NETWORK,
      transactionKindBytes,
      sender,
      allowedMoveCallTargets: [target],
    });
    return NextResponse.json({ bytes, digest });
  } catch (err) {
    // A rejection here usually means the Enoki Portal's own sponsored-
    // transaction config doesn't allow this target/sender yet — see
    // docs/security-assessment.md "Sponsored transactions" for the exact
    // Portal setup this depends on. Surface the real message; it's an
    // operator-facing config problem, not something to hide from the caller.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not sponsor this transaction." },
      { status: 502 },
    );
  }
}
