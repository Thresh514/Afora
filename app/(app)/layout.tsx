import Header from "@/components/Header";
import AppOnboarding from "@/components/AppOnboarding";
import { SidebarProvider } from "@/components/ui/sidebar";
import MySidebar from "@/components/MySidebar";
import StoreProvider from "../StoreProvider";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SidebarProvider
      className="flex flex-col h-screen"
      style={
        {
          "--sidebar-width": "14rem",
          "--sidebar-width-icon": "5rem",
          "--sidebar-width-mobile": "0rem",
        } as React.CSSProperties
      }
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex h-full w-full">
          <MySidebar />
          <div className="flex flex-col overflow-hidden w-full">
            <AppOnboarding />
            <main className="flex-1 overflow-auto w-full bg-gray-100">
              <StoreProvider>{children}</StoreProvider>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
