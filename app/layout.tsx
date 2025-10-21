/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { Footer } from "../components/layout/Footer";
import { NavBar } from "../components/layout/NavBar";
import { AuthProvider } from "../contexts/AuthContext";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kiconu — Unlock Your Potential",
  description:
    "A unique fusion of nutrition and transpersonal coaching to help you achieve holistic well-being.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap"
        />
      </head>
      <body
        className={`${lexend.variable} bg-background font-display text-foreground antialiased`}
      >
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <NavBar />
            <main className="flex-1 bg-background">
              <div className="mx-auto w-full max-w-6xl px-6 md:px-10">{children}</div>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
