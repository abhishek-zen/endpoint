import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chat",
  description: "AI Chat powered by your custom endpoint",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Bodhini tour guide SDK */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.bodhiniConfig = { userId: "${process.env.NEXT_PUBLIC_BODHINI_USER_ID ?? ''}", email: "${process.env.NEXT_PUBLIC_BODHINI_EMAIL ?? ''}", plan: "${process.env.NEXT_PUBLIC_BODHINI_PLAN ?? ''}" };`,
          }}
        />
        <script
          id="bodhiniScript"
          src={process.env.NEXT_PUBLIC_BODHINI_URL}
          data-token={process.env.NEXT_PUBLIC_BODHINI_TOKEN}
          async
        />
      </body>
    </html>
  );
}
