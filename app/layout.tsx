/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { Footer } from "../components/layout/Footer";
import { NavBar } from "../components/layout/NavBar";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kiconu — Desbloquea Tu Potencial",
  description:
    "Una fusión única de nutrición y coaching transpersonal para ayudarte a lograr el bienestar holístico.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap"
        />
      </head>
      <body
        className={`${lexend.variable} bg-background font-display text-foreground antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <AuthGuard />
            <div className="flex min-h-screen flex-col">
              <NavBar />
              <main className="flex-1 bg-background">
                <div className="mx-auto w-full max-w-6xl px-6 md:px-10">{children}</div>
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
