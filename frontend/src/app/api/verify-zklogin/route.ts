import { NextRequest, NextResponse } from "next/server";
import { SuiGrpcClient } from "@mysten/sui/grpc";

// Runs server-side in Node, never in the browser — this is what lets it use
// @mysten/sui's gRPC client directly instead of the deprecated JSON-RPC or the
// currently-disabled public testnet GraphQL endpoint (see docs/security-
// assessment.md, "Wallet-native authentication"). Called only by the Spring
// Boot backend, server-to-server; never by the browser.
export const runtime = "nodejs";

const GRPC_URL = "https://fullnode.testnet.sui.io:443";
const client = new SuiGrpcClient({ network: "testnet", baseUrl: GRPC_URL });

interface VerifyZkLoginBody {
  bytes?: string;
  signature?: string;
  address?: string;
}

/**
 * Thin, faithful proxy over @mysten/sui's own verifyZkLoginSignature — the
 * exact call its SDK makes internally to check a zkLogin personal-message
 * signature. Does not attempt to re-derive or second-guess the result: the
 * caller (WalletAuthService, in the Java backend) still decides what to do
 * with `success`, and this endpoint reveals nothing a holder of the signature
 * doesn't already know, so it needs no auth of its own.
 */
export async function POST(req: NextRequest) {
  let body: VerifyZkLoginBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const { bytes, signature, address } = body;
  if (!bytes || !signature || !address) {
    return NextResponse.json(
      { error: "bytes, signature, and address are all required" },
      { status: 400 },
    );
  }

  try {
    const result = await client.core.verifyZkLoginSignature({
      bytes,
      signature,
      intentScope: "PersonalMessage",
      address,
    });
    return NextResponse.json({ success: result.success === true, errors: result.errors });
  } catch (err) {
    // A malformed signature throws here rather than resolving with
    // success:false — that's a real distinction the client needs, so surface
    // it as a 502 (an environmental/upstream failure), not a plain false.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "zkLogin verification failed" },
      { status: 502 },
    );
  }
}
