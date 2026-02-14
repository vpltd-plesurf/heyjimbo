import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DemoProvider } from "@/lib/demo-context";
import { MasterPasswordProvider } from "@/contexts/master-password-context";
import { ThemeProvider } from "@/contexts/theme-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HeyJimbo",
  description: "Personal information organizer",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HeyJimbo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
        <ThemeProvider>
          <DemoProvider>
            <MasterPasswordProvider>{children}</MasterPasswordProvider>
          </DemoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
