import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthWrapper from '@/components/auth/AuthWrapper'
import ErrorBoundary from '@/components/ErrorBoundary'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CactAI - The Social Good LLM",
  description: "Like Ecosia for AI conversations. Chat with AI and plant trees!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} antialiased bg-gray-900 text-white`}
      >
        <ErrorBoundary>
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
