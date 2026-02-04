import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-afora/10 via-afora/5 to-afora/10 px-4 py-12">
      <SignIn fallbackRedirectUrl="/home" />
    </main>
  );
}
