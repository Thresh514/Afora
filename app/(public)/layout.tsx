import PublicNavbar from "@/components/PublicNavbar";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
