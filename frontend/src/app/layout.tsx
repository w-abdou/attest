import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Attest",
  description: "Secure document signing and verification — Week 1 prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
      <body className="bg-white text-gray-900 min-h-screen">
      <AuthProvider>
        <NavBar />
        <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
      </AuthProvider>
      </body>
      </html>
  );
}