"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { registerDocumentOnChain } from "@/lib/onchainRegister";
import * as api from "@/lib/api";
import { ApiError, DocumentResponse, SignatureResponse } from "@/lib/api";

interface Props {
  doc: DocumentResponse;
  signers: SignatureResponse[];
  onRegistered: () => void; // called to refresh the page after success
}

// No local DAppKitProvider here — RootLayout already wraps the whole app in
// one via WalletProvider, and DAppKitProvider is a plain context passthrough
// (the same dAppKit singleton either way), so nesting another added nothing.
export default function OnChainRegisterButton({ doc, signers, onRegistered }: Props) {
  const account = useCurrentAccount();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const alreadyRegistered = !!doc.onchainObjectId;
  const missingEnvelope = !doc.envelopeHash;
  const signersWithoutAddress = signers.filter((s) => !s.suiAddress);
  const noSigners = signers.length === 0;

  async function handleRegister() {
    setMsg(null);

    if (!account) {
      // Being signed in already implies a connected wallet (see AuthContext.
      // loginWithWallet) — this only fires if it was disconnected separately
      // mid-session, e.g. from the Wallet page or the extension itself.
      setMsg({ tone: "err", text: "Your wallet is disconnected. Reconnect it on the Wallet page, then try again." });
      return;
    }
    if (missingEnvelope) {
      setMsg({ tone: "err", text: "Assign required signers first so the document has an envelope hash." });
      return;
    }
    if (noSigners) {
      setMsg({ tone: "err", text: "This version has no required signers to register." });
      return;
    }
    if (signersWithoutAddress.length > 0) {
      // Unreachable for any account created after wallet-native auth landed —
      // every login proves a Sui address. Kept as a safety net for accounts
      // that predate the migration and never linked one.
      setMsg({
        tone: "err",
        text: `These signers have no Sui address on file: ${signersWithoutAddress.map((s) => s.username ? `@${s.username}` : s.email ?? `user #${s.signerId}`).join(", ")}`,
      });
      return;
    }

    setBusy(true);
    try {
      const addresses = signers.map((s) => s.suiAddress as string);
      const result = await registerDocumentOnChain(doc.id, doc.envelopeHash as string, addresses);
      await api.recordOnchainRegistration(
        doc.id, result.objectId, result.txDigest, result.packageId, result.network,
      );
      setMsg({ tone: "ok", text: "Registered on Sui. The document proof is now on-chain." });
      onRegistered();
    } catch (err) {
      setMsg({
        tone: "err",
        text: err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "On-chain registration failed."),
      });
    } finally {
      setBusy(false);
    }
  }

  if (alreadyRegistered) {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-medium text-emerald-700">✓ Registered on {doc.onchainNetwork}</p>
        <p className="break-all font-mono text-xs text-ink-500">object: {doc.onchainObjectId}</p>
        <p className="break-all font-mono text-xs text-ink-400">tx: {doc.onchainTxDigest}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleRegister}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-sui-600 px-4 text-sm font-medium text-white shadow-sm shadow-sui-600/30 transition-colors hover:bg-sui-700 disabled:opacity-50"
      >
        {busy ? "Registering on Sui…" : "Register on-chain"}
      </button>
      <p className="text-xs text-ink-500">
        Anchors this document&apos;s envelope hash and required signers on Sui testnet. Your
        connected wallet signs the transaction and pays the (test) gas.
      </p>
      {msg && (
        <p
          className={`rounded-lg border p-2 text-sm ${
            msg.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}