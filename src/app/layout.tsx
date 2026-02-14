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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <DemoProvider>
            <MasterPasswordProvider>{children}</MasterPasswordProvider>
          </DemoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
