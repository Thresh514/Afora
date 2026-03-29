import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-afora/10 via-afora/5 to-afora/10 px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-fit -ml-1 text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Link>
        </Button>
        <SignIn
          forceRedirectUrl="/home"
          fallbackRedirectUrl="/home"
          signUpForceRedirectUrl="/home"
          signUpFallbackRedirectUrl="/home"
        />
      </div>
    </main>
  );
}
