"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PublicFooter from "@/components/PublicFooter";
import FadeInSection, { FadeInStagger } from "@/components/FadeInSection";

const HERO_BG_IMAGES = ["/1.png", "/6.png", "/7.png"] as const;

const PARTNER_LOGOS = [
  { src: "/babson.svg", alt: "Babson" },
  { src: "/kumokumo.png", alt: "Kumokumo" },
  { src: "/mit.png", alt: "MIT" },
  { src: "/neu.svg", alt: "NEU" },
  { src: "/tufts.jpg", alt: "Tufts" },
  { src: "/wellesley.svg.png", alt: "Wellesley" },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const [heroBg, setHeroBg] = useState<(typeof HERO_BG_IMAGES)[number]>(HERO_BG_IMAGES[0]);

  useEffect(() => {
    setHeroBg(HERO_BG_IMAGES[Math.floor(Math.random() * HERO_BG_IMAGES.length)]);
  }, []);

  return (
    <main className="min-h-full">
      {/* Hero */}
      <section
        id="hero"
        className="relative flex min-h-screen flex-col justify-center overflow-hidden px-4 pt-28 pb-20 md:pt-32 md:pb-28"
      >
        <div
          className="absolute inset-0 min-h-screen bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${heroBg}")`,
          }}
        />
        <div
          className="absolute inset-0 min-h-screen bg-no-repeat"
          style={{
            background: `linear-gradient(to bottom, rgba(248,250,252,0.9) 0%, rgba(248,250,252,0.4) 18%, rgba(30,41,59,0.5) 45%, rgba(15,23,42,0.85) 100%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 text-left">
          <p className="mb-5 text-base font-semibold uppercase tracking-wider text-white/80 md:text-lg">
            Afora
          </p>
          <h1 className="mb-8 font-serif text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            <span className="block text-6xl font-bold leading-tight text-white md:text-7xl lg:text-8xl">Where</span>
            <span
              className="mt-2 block h-[1.25em] overflow-hidden text-xl leading-[1.25] text-white sm:text-2xl md:text-3xl lg:text-5xl"
              style={{ contain: "layout paint" }}
            >
              <span className="block animate-sentence-roll">
                {(() => {
                  const lines = [
                    " high-performing teams begin.",
                    " teams align from day one.",
                    " teams click, and results scale.",
                    " motivation is built in.",
                    " incentives drive behaviors. ",
                    " teams are built for tomorrow.",
                    " the right people connect.",
                  ];
                  return [...lines, lines[0]];
                })().map((line, i) => (
                  <span
                    key={i}
                    className="flex h-[1.25em] shrink-0 items-center whitespace-nowrap leading-[1.25] text-xl sm:text-2xl md:text-3xl lg:text-5xl ml-2"
                  >
                    {line}
                  </span>
                ))}
              </span>
            </span>
          </h1>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl bg-afora px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-afora-hover"
            >
              Get started free
            </button>
          </div>
        </div>
      </section>

      {/* Trust bar - partner brands */}
      <FadeInSection>
      <section className="overflow-hidden border-y border-gray-200 bg-afora/5 py-12 md:py-14">
        <p className="mb-8 text-center text-base font-medium text-gray-500 md:text-lg">
          Trusted by teams everywhere
        </p>
        <div className="flex w-full">
          <div className="flex animate-marquee gap-16 whitespace-nowrap">
            {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((brand, i) => (
                <div
                  key={i}
                  className="inline-flex h-16 w-36 flex-shrink-0 items-center justify-center rounded-xl bg-white/90 p-3 md:h-20 md:w-44"
                  aria-hidden
                >
                  <Image src={brand.src} alt={brand.alt} width={120} height={48} className="object-contain h-full w-full" />
                </div>
              ))}
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* Features */}
      <FadeInSection>
      <section id="features" className="border-b border-gray-200 bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-5 font-serif text-4xl font-bold text-gray-900 md:text-5xl">
              AI-powered team features
            </h2>
            <p className="text-xl text-gray-600 md:text-2xl">
              From roadmap generation to team matching and compatibility analysis—AI that helps you ship.
            </p>
          </div>

          <FadeInStagger delayMs={140}>
          <div className="grid gap-12 md:grid-cols-2 md:items-center pb-16 md:pb-24">
            <div>
              <h3 className="mb-5 text-2xl font-semibold text-gray-900 md:text-3xl">
                AI roadmap generation for faster kickoffs
              </h3>
              <p className="mb-8 text-lg text-gray-600 md:text-xl">
                Turn your team charter and project goals into a full roadmap in one click. Get stages and tasks tailored to your team size, with clear ownership and descriptions—no more blank boards.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#16a34a]"
              >
                Generate roadmap
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
            <div className="relative flex justify-center">
              <div className="h-80 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-xl md:h-96">
                <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">Project roadmap</p>
                <div className="mb-4 h-2.5 w-28 rounded-full bg-afora/20" />
                <div className="space-y-3 text-base text-gray-700">
                  <p className="font-semibold">Stage: Research &amp; Design</p>
                  <p className="text-gray-500">Task: Define user flows · Assignee: —</p>
                  <p className="text-gray-500">Task: Create wireframes · Assignee: —</p>
                </div>
                <p className="mt-4 text-sm text-afora font-medium">AI generated · Accept to apply</p>
              </div>
            </div>
          </div>

          <div className="grid gap-12 md:grid-cols-2 md:items-center pb-16 md:pb-24">
            <div className="md:order-2">
              <h3 className="mb-5 text-2xl font-semibold text-gray-900 md:text-3xl">
                Smart team matching for better chemistry
              </h3>
              <p className="mb-8 text-lg text-gray-600 md:text-xl">
                Group members into teams based on skills, interests, and goals from onboarding surveys. Get a compatibility score and suggested assignments—then drag to adjust and apply in one click.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#16a34a]"
              >
                Try smart matching
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
            <div className="relative flex justify-center md:order-1">
              <div className="h-80 w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-900/95 p-8 shadow-xl md:h-96">
                <p className="mb-4 text-sm font-medium uppercase tracking-wider text-green-400">Smart matching preview</p>
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400">Compatibility 87</span>
                </div>
                <div className="space-y-3 text-base text-gray-300">
                  <p>Team A: alice@, bob@, carol@</p>
                  <p>Team B: dave@, eve@, frank@</p>
                </div>
                <p className="mt-4 text-sm text-gray-400">Drag to adjust · Apply when ready</p>
              </div>
            </div>
          </div>

          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="mb-5 text-2xl font-semibold text-gray-900 md:text-3xl">
                Team compatibility analysis for stronger dynamics
              </h3>
              <p className="mb-8 text-lg text-gray-600 md:text-xl">
                Get a weighted score across technical alignment, schedule, interests, and work style—plus AI recommendations to improve collaboration. Know how well your team fits before you start.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#16a34a]"
              >
                Analyze my team
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
            <div className="relative flex justify-center">
              <div className="h-80 w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-900/95 p-8 shadow-xl md:h-96">
                <p className="mb-3 text-sm font-medium uppercase tracking-wider text-green-400">Team analysis</p>
                <div className="mb-4 h-3 w-full rounded-full bg-gray-700">
                  <div className="h-full w-[88%] rounded-full bg-green-500" />
                </div>
                <p className="mb-4 text-4xl font-bold text-white">88</p>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>Technical · Schedule · Interest · Communication · Work style</p>
                </div>
                <p className="mt-4 text-sm text-gray-300">Key recommendations · Refresh to re-analyze</p>
              </div>
            </div>
          </div>
          </FadeInStagger>
        </div>
      </section>
      </FadeInSection>

      {/* Proof */}
      <FadeInSection>
      <section id="platform" className="border-b border-gray-200 bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 font-serif text-4xl font-bold text-gray-900 md:text-5xl">
            Proof is in the performance
          </h2>
          <p className="mb-16 text-xl text-gray-600 md:text-2xl">
            Afora helps you deliver more, backed by clear progress and real results. Fewer meetings, more shipped.
          </p>
          <FadeInStagger className="grid gap-12 sm:grid-cols-3" delayMs={120}>
            <div>
              <p className="text-5xl font-bold text-afora md:text-6xl">10k+</p>
              <p className="mt-2 text-lg text-gray-600">teams onboarded</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-afora md:text-6xl">2x</p>
              <p className="mt-2 text-lg text-gray-600">faster delivery</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-afora md:text-6xl">95%</p>
              <p className="mt-2 text-lg text-gray-600">less context switching</p>
            </div>
          </FadeInStagger>
        </div>
      </section>
      </FadeInSection>

      {/* For Teams */}
      <FadeInSection>
      <section id="resources" className="border-b border-gray-200 bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-5 font-serif text-4xl font-bold text-gray-900 md:text-5xl">
              Built for teams and organizations
            </h2>
            <p className="text-xl text-gray-600 md:text-2xl">
              Afora is B2B. Whether you’re a startup, product team, agency, or enterprise—AI and one workspace scale with you.
            </p>
          </div>
          <FadeInStagger className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4" delayMs={80}>
            {[
              { name: "Startups", desc: "One workspace, one source of truth.", ai: "Generate roadmaps and match teams in one click." },
              { name: "Product teams", desc: "Ship features on time with clear stages and owners.", ai: "AI tasks + compatibility so the team fits." },
              { name: "Agencies", desc: "Multiple clients and projects in one place.", ai: "Smart matching across projects." },
              { name: "Enterprises", desc: "Orgs, projects, and permissions that scale.", ai: "AI on a solid PM foundation—scales with you." },
            ].map((persona) => (
              <div
                key={persona.name}
                className="rounded-2xl border border-gray-200 bg-gray-50/50 p-8 text-left transition hover:border-afora/30 hover:shadow-lg"
              >
                <h3 className="mb-3 text-xl font-semibold text-gray-900">{persona.name}</h3>
                <p className="mb-3 text-base text-gray-600">{persona.desc}</p>
                <p className="text-sm text-afora font-medium">{persona.ai}</p>
              </div>
            ))}
          </FadeInStagger>
        </div>
      </section>
      </FadeInSection>

      {/* Price plans (simplified) */}
      <FadeInSection>
      <section id="solutions" className="border-b border-gray-200 bg-gray-50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 font-serif text-4xl font-bold text-gray-900 md:text-5xl">
              Simple pricing that scales with you
            </h2>
            <p className="text-lg text-gray-600 md:text-xl">
              Start free. Unlock AI-powered features when your team is ready.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="grid min-w-[560px] grid-cols-3 divide-x divide-gray-200">
              {/* Free */}
              <div className="flex flex-col p-6">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Free</h3>
                <p className="mb-5 flex-1 text-sm text-gray-600">
                  Use the full platform at no cost. Perfect for trying Afora with your team.
                </p>
                <p className="mb-5 text-2xl font-bold text-gray-900">$0</p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Get started free
                </button>
              </div>
              {/* Team */}
              <div className="flex flex-col bg-afora/5 p-6">
                <span className="mb-2 inline-block w-fit rounded-full bg-afora px-2.5 py-0.5 text-xs font-semibold text-white">Popular</span>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Team</h3>
                <p className="mb-5 flex-1 text-sm text-gray-600">
                  Per user per month. Everyone on the team needs a seat to collaborate in one place.
                </p>
                <p className="mb-5 flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-gray-900">$9</span>
                  <span className="text-sm text-gray-500">/user/month</span>
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full rounded-lg bg-afora py-2.5 text-sm font-semibold text-white transition hover:bg-afora-hover"
                >
                  Start free trial
                </button>
              </div>
              {/* Enterprise */}
              <div className="flex flex-col p-6">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Enterprise</h3>
                <p className="mb-5 flex-1 text-sm text-gray-600">
                  For large organizations. Custom pricing and terms—contact us to discuss your needs.
                </p>
                <p className="mb-5 text-2xl font-bold text-gray-900">Custom</p>
                <Link
                  href="#"
                  className="block w-full rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Contact sales
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-gray-500">
            Compare all features and see full pricing{" "}
            <Link href="/price" className="font-medium text-afora hover:underline">
              on our pricing page →
            </Link>
          </p>
        </div>
      </section>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
      <section id="pricing" className="bg-gradient-to-br from-afora to-indigo-700 px-4 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            More clarity. Fewer meetings. Start for free.
          </h2>
          <p className="mb-12 text-xl text-white/90 md:text-2xl">
            Ready to ship with less chaos? Try Afora free and see why teams choose one place for projects and people.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl bg-white px-10 py-5 text-lg font-semibold text-afora shadow-xl transition hover:bg-gray-100"
            >
              Sign Up Free
            </button>
            <Link
              href="/price"
              className="rounded-xl border-2 border-white/60 px-10 py-5 text-lg font-semibold text-white transition hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
      </FadeInSection>

      <PublicFooter />
    </main>
  );
}
