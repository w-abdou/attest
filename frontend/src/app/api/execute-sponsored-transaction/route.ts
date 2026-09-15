import { NextRequest, NextResponse } from "next/server";
import { EnokiClient } from "@mysten/enoki";

// Runs server-side in Node, never in the browser — same ENOKI_SECRET_KEY
// boundary as the sibling sponsor-transaction route. This route only ever
// executes a transaction Enoki itself already sponsored and the connected
// wallet already signed (see lib/sponsoredTransaction.ts) — it has no say
// over what gets called, only whether the signature is valid for the
// digest Enoki issued.
export const runtime = "nodejs";

const ENOKI_SECRET_KEY = process.env.ENOKI_SECRET_KEY;

interface ExecuteRequestBody {
  digest?: string;
  signature?: string;
}

export async function POST(req: NextRequest) {
  if (!ENOKI_SECRET_KEY) {
    return NextResponse.json(
      { error: "Sponsored transactions are not configured on this server (ENOKI_SECRET_KEY is not set)." },
      { status: 501 },
    );
  }

  let body: ExecuteRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const { digest, signature } = body;
  if (!digest || !signature) {
    return NextResponse.json({ error: "digest and signature are both required" }, { status: 400 });
  }

  const enokiClient = new EnokiClient({ apiKey: ENOKI_SECRET_KEY });
  try {
    const result = await enokiClient.executeSponsoredTransaction({ digest, signature });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not execute the sponsored transaction." },
      { status: 502 },
    );
  }
}
