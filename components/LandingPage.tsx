"use client";

import { useRouter } from "next/navigation";
export default function LandingPage() {
  const router = useRouter();
  return (
    <main className="min-h-full bg-gradient-to-r from-[#6F61EF] via-[#6F61EF] to-purple-500/20 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Afora
        </h1>
        <p className="text-xl text-white/90 mb-2">
          Your next all-in-one team management app
        </p>
        <p className="text-white/80 mb-10">
          Create an account to start using Afora.
        </p>
        <button className="bg-white hover:bg-gray-100 text-[#6F61EF] font-bold py-3 px-8 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg" onClick={() => router.push('/login')}>Login</button>
      </div>
    </main>
  );
}
