import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { FloatingUtility } from "@/components/floating-utility";
import "./globals.css";

export const metadata: Metadata = {
  title: "Court Pulse",
  description: "Real-time pickup pickleball court activity. See who's playing, find your skill level, and signal you're ready to play.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
          <FloatingUtility />
        </AuthProvider>
      </body>
    </html>
  );
}
