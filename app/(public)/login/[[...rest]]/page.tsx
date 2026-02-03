import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-gradient-to-r from-[#6F61EF]/10 via-[#6F61EF]/5 to-purple-500/10 px-4 py-12">
      <SignIn afterSignInUrl="/home" />
    </main>
  );
}
