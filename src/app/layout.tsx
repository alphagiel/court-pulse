import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <FloatingUtility />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
