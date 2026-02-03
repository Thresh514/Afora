import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import CronInitializer from "@/components/CronInitializer";

export const metadata: Metadata = {
  title: "Afora",
  description: "Your next all-in-one team management app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      afterSignOutUrl="/login"
    >
      <html lang="en">
        <head>
          <link rel="icon" href="/icon.svg" type="image/svg" sizes="any"/>
        </head>
        <body>
          {children}
          <CronInitializer />
          <Toaster position="top-center" />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
