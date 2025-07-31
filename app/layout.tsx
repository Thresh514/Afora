import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import AppOnboarding from "@/components/AppOnboarding";
import { SidebarProvider } from "@/components/ui/sidebar"
import MySidebar from "@/components/MySidebar";
import StoreProvider from "./StoreProvider";

export const metadata: Metadata = {
  title: "Afora",
  description: "Your next all-in-one project management app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <html lang="en">
        <head>
          <link rel="icon" href="/icon.svg" type="image/svg" sizes="any"/>
        </head>
        <body>
          <SidebarProvider className="flex flex-col h-screen" style={{
            "--sidebar-width": "10rem",
            "--sidebar-width-mobile": "0rem",
          } as React.CSSProperties}>
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <SignedIn>
                <div className="flex h-full w-full">
                  <MySidebar />
                  <div className="flex flex-col overflow-hidden w-full">
                    <AppOnboarding />
                    <main className="flex-1 overflow-auto w-full bg-gray-100">
                      <StoreProvider>
                        {children}
                      </StoreProvider>
                    </main>
                  </div>
                </div>
              </SignedIn>

              <SignedOut>
                <div className="flex-1 w-full h-full bg-gradient-to-r from-[#6F61EF] via-[#6F61EF] to-purple-500/0 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                      Welcome to Afora
                    </h2>
                    <p className="text-xl text-gray-600 mb-8 text-center">
                      Create an account to start using Afora!
                    </p>
                    <div className="flex justify-center">
                      <SignInButton mode="modal">
                        <button className="bg-[#6F61EF] hover:bg-[#5948ee] text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">
                          Sign Up / Sign In
                        </button>
                      </SignInButton>
                    </div>
                  </div>
                </div>
              </SignedOut>
            </div>
          </SidebarProvider>
          <Toaster position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}

