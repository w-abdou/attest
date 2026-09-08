import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: { default: "Attest", template: "%s · Attest" },
  description:
    "Secure document signing and verification — team-scoped access, immutable versions, and SHA-256 integrity proofs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink-900 antialiased">
        <AuthProvider>
          <ToastProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sui-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
            >
              Skip to content
            </a>
            <NavBar />
            <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              {children}
            </main>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
