"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PublicFooter from "@/components/PublicFooter";
import FadeInSection, { FadeInStagger } from "@/components/FadeInSection";
import { Target, Clock, NotepadText, CircleCheck, AlertCircle, CheckCircle2 } from "lucide-react";

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
            <span className="block text-6xl font-bold leading-tight text-white md:text-7xl lg:text-8xl">
              Where
            </span>
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
                  <Image
                    src={brand.src}
                    alt={brand.alt}
                    width={120}
                    height={48}
                    className="object-contain h-full w-full"
                  />
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
                From roadmap generation to team matching, compatibility analysis, and bounty
                board—AI and tools that help you ship.
              </p>
            </div>

            <FadeInStagger delayMs={140}>
              <div className="grid gap-12 md:grid-cols-2 md:items-center pb-16 md:pb-24">
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-gray-900 md:text-2xl">
                    Incentives Aligned from Day One
                  </h3>
                  <p className="mb-6 text-base text-gray-600 md:text-lg">
                    Afora uses advanced AI matching to assemble teams based on skills, goals, and
                    working dynamics. Alignment starts early, reducing friction and increasing the
                    likelihood of sustained performance
                  </p>
                  <button
                    onClick={() => router.push("/login")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#16a34a]"
                  >
                    Try smart matching
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>
                </div>
                <div className="relative flex justify-center">
                  <div className="relative h-96 w-full overflow-hidden rounded-2xl border border-zinc-500/50 bg-gradient-to-b from-zinc-700 to-zinc-800 p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] md:h-[28rem]">
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-90"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(100% 70% at 50% -10%, rgba(255,255,255,0.07), transparent 50%), radial-gradient(80% 50% at 100% 100%, rgba(68,55,195,0.08), transparent 45%)",
                      }}
                    />
                    <div className="relative">
                      <p className="mb-3 text-sm font-semibold tracking-wide text-zinc-100">
                        Smart Matching Preview
                      </p>
                      <div className="mb-4 grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-zinc-500/35 bg-zinc-900/25 p-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          <div className="text-sm font-bold tabular-nums text-sky-300">6</div>
                          <div className="text-[11px] font-medium tracking-wide text-zinc-400">
                            Unassigned
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-500/35 bg-zinc-900/25 p-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          <div className="text-sm font-bold tabular-nums text-[#a78bfa]">87</div>
                          <div className="text-[11px] font-medium tracking-wide text-zinc-400">
                            Avg score
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-h-[100px] rounded-xl border border-dashed border-zinc-500/45 bg-zinc-900/20 p-3 shadow-inner">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="truncate text-sm font-semibold tracking-wide text-zinc-100">
                              Project Alpha
                            </h3>
                            <span className="shrink-0 rounded-md border border-afora/35 bg-afora/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-50">
                              87/100
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-xl border border-zinc-500/40 bg-gradient-to-b from-zinc-600/50 to-zinc-700/40 px-2 py-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/12 ring-1 ring-amber-300/25">
                                <AlertCircle
                                  className="h-3.5 w-3.5 text-amber-300"
                                  strokeWidth={2.25}
                                />
                              </span>
                              <span className="min-w-0 truncate font-mono text-[11px] font-medium tracking-wide text-zinc-200">
                                admin@
                              </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-zinc-500/40 bg-gradient-to-b from-zinc-600/50 to-zinc-700/40 px-2 py-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-400/12 ring-1 ring-teal-300/22">
                                <CheckCircle2
                                  className="h-3.5 w-3.5 text-teal-300"
                                  strokeWidth={2.25}
                                />
                              </span>
                              <span className="min-w-0 truncate font-mono text-[11px] font-medium tracking-wide text-zinc-200">
                                alice@
                              </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-zinc-500/40 bg-gradient-to-b from-zinc-600/50 to-zinc-700/40 px-2 py-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-400/12 ring-1 ring-teal-300/22">
                                <CheckCircle2
                                  className="h-3.5 w-3.5 text-teal-300"
                                  strokeWidth={2.25}
                                />
                              </span>
                              <span className="min-w-0 truncate font-mono text-[11px] font-medium tracking-wide text-zinc-200">
                                bob@
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="min-h-[100px] rounded-xl border border-dashed border-zinc-500/45 bg-zinc-900/20 p-3 shadow-inner">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="truncate text-sm font-semibold tracking-wide text-zinc-100">
                              Project Beta
                            </h3>
                            <span className="shrink-0 rounded-md border border-afora/35 bg-afora/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-50">
                              82/100
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-xl border border-zinc-500/40 bg-gradient-to-b from-zinc-600/50 to-zinc-700/40 px-2 py-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/12 ring-1 ring-amber-300/25">
                                <AlertCircle
                                  className="h-3.5 w-3.5 text-amber-300"
                                  strokeWidth={2.25}
                                />
                              </span>
                              <span className="min-w-0 truncate font-mono text-[11px] font-medium tracking-wide text-zinc-200">
                                dave@
                              </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-zinc-500/40 bg-gradient-to-b from-zinc-600/50 to-zinc-700/40 px-2 py-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-400/12 ring-1 ring-teal-300/22">
                                <CheckCircle2
                                  className="h-3.5 w-3.5 text-teal-300"
                                  strokeWidth={2.25}
                                />
                              </span>
                              <span className="min-w-0 truncate font-mono text-[11px] font-medium tracking-wide text-zinc-200">
                                eve@
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] font-medium tracking-wider text-zinc-500">
                        Drag to adjust · Confirm assignment
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-12 md:grid-cols-2 md:items-center pb-16 md:pb-24">
                <div className="md:order-2">
                  <h3 className="mb-4 text-xl font-semibold text-gray-900 md:text-2xl">
                    Collective Accountability
                  </h3>
                  <p className="mb-6 text-base text-gray-600 md:text-lg">
                    Teams move forward together. When one member falls behind, the group pauses.
                    This structure encourages early intervention, proactive support, and shared
                    ownership. Real collaboration, not isolated task completion
                  </p>
                  <button
                    onClick={() => router.push("/login")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#16a34a]"
                  >
                    Generate roadmap
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>
                </div>
                <div className="relative flex justify-center md:order-1">
                  <div className="relative h-96 w-full overflow-hidden rounded-2xl border border-zinc-500/50 bg-gradient-to-b from-zinc-700 to-zinc-800 p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] md:h-[28rem]">
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-90"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(100% 70% at 50% -10%, rgba(255,255,255,0.07), transparent 50%), radial-gradient(80% 50% at 100% 100%, rgba(68,55,195,0.08), transparent 45%)",
                      }}
                    />
                    <div className="relative">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/12 ring-1 ring-sky-300/25">
                          <Target className="h-4 w-4 text-sky-300" strokeWidth={2.25} />
                        </span>
                        <p className="text-sm font-semibold tracking-wide text-zinc-100">
                          Team Roadmap
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-500/35 bg-zinc-900/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          Team stages
                        </h3>
                        <div className="space-y-2">
                          <div className="rounded-xl border border-zinc-500/40 bg-gradient-to-b from-zinc-600/50 to-zinc-700/40 p-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold tracking-wide text-zinc-100">
                                1. Research &amp; Design
                              </span>
                              <span className="flex shrink-0 items-center text-[11px] font-medium tracking-wide text-zinc-400">
                                <Clock
                                  className="mr-1.5 h-3.5 w-3.5 text-zinc-500"
                                  strokeWidth={2.25}
                                />
                                0 / 3 tasks
                              </span>
                            </div>
                          </div>
                          <div className="rounded-xl border border-teal-400/22 bg-gradient-to-b from-teal-950/35 to-zinc-800/45 p-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] ring-1 ring-inset ring-teal-400/12">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold tracking-wide text-zinc-100">
                                2. Development
                              </span>
                              <span className="flex shrink-0 items-center text-[11px] font-medium tracking-wide text-zinc-400">
                                <NotepadText
                                  className="mr-1.5 h-3.5 w-3.5 text-amber-300"
                                  strokeWidth={2.25}
                                />
                                2 / 4 tasks
                              </span>
                            </div>
                          </div>
                          <div className="rounded-xl border border-teal-400/22 bg-gradient-to-b from-teal-950/30 to-zinc-800/45 p-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] ring-1 ring-inset ring-teal-400/12">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold tracking-wide text-zinc-100">
                                3. Testing &amp; Launch
                              </span>
                              <span className="flex shrink-0 items-center text-[11px] font-medium tracking-wide text-zinc-400">
                                <CircleCheck
                                  className="mr-1.5 h-3.5 w-3.5 text-teal-300"
                                  strokeWidth={2.25}
                                />
                                2 / 2 tasks
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] font-medium tracking-wider text-sky-300/95">
                        AI generated · Accept to apply
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-12 md:grid-cols-2 md:items-center">
                <div className="md:order-1">
                  <h3 className="mb-4 text-xl font-semibold text-gray-900 md:text-2xl">
                    Built-In Reward &amp; Recognition
                  </h3>
                  <p className="mb-6 text-base text-gray-600 md:text-lg">
                    A transparent, point-based incentive system rewarding contribution
                    proportionally. It sustains momentum, reinforces fair accountability, and
                    reduces administrative overhead in performance evaluation
                  </p>
                  <button
                    onClick={() => router.push("/login")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#16a34a]"
                  >
                    View Bounty Board
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>
                </div>
                <div className="relative flex justify-center md:order-2">
                  <div className="relative h-96 w-full overflow-hidden rounded-2xl border border-zinc-500/50 bg-gradient-to-b from-zinc-700 to-zinc-800 p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] md:h-[28rem]">
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-90"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(100% 70% at 50% -10%, rgba(255,255,255,0.07), transparent 50%), radial-gradient(80% 50% at 100% 100%, rgba(68,55,195,0.08), transparent 45%)",
                      }}
                    />
                    <div className="relative">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-orange-300">
                        Bounty board
                      </p>
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-xl border border-zinc-500/40 bg-zinc-900/25 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-all hover:border-orange-400/35">
                          <div className="flex items-center justify-between bg-gradient-to-r from-amber-600/95 to-orange-600/95 px-3 py-2.5">
                            <span className="text-xs font-semibold tracking-wider text-white">
                              OVERDUE
                            </span>
                            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold tabular-nums tracking-wide text-white">
                              10 pts
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold tracking-wide text-zinc-100">
                              Define user flows
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs tracking-wide text-zinc-400">
                              Create user flow diagrams for core features
                            </p>
                            <p className="mt-2 text-xs font-medium tracking-wider text-orange-300">
                              Claim task · Earn points
                            </p>
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-zinc-500/40 bg-zinc-900/25 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-all hover:border-orange-400/35">
                          <div className="flex items-center justify-between bg-gradient-to-r from-amber-600/95 to-orange-600/95 px-3 py-2.5">
                            <span className="text-xs font-semibold tracking-wider text-white">
                              OVERDUE
                            </span>
                            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold tabular-nums tracking-wide text-white">
                              10 pts
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold tracking-wide text-zinc-100">
                              Create wireframes
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs tracking-wide text-zinc-400">
                              Design wireframes for main screens
                            </p>
                            <p className="mt-2 text-xs font-medium tracking-wider text-orange-300">
                              Claim task · Earn points
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
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
              Afora helps you deliver more, backed by clear progress and real results. Fewer
              meetings, more shipped.
            </p>
            <FadeInStagger className="grid gap-12 sm:grid-cols-3" delayMs={120}>
              <div>
                <p className="text-5xl font-bold text-afora md:text-6xl">10+</p>
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
                Afora is B2B. Whether you’re a startup, product team, agency, or enterprise—AI and
                one workspace scale with you.
              </p>
            </div>
            <FadeInStagger className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4" delayMs={80}>
              {[
                {
                  name: "Startups",
                  desc: "One workspace, one source of truth.",
                  ai: "Generate roadmaps and match teams in one click.",
                },
                {
                  name: "Product teams",
                  desc: "Ship features on time with clear stages and owners.",
                  ai: "AI tasks + compatibility so the team fits.",
                },
                {
                  name: "Agencies",
                  desc: "Multiple clients and projects in one place.",
                  ai: "Smart matching across projects.",
                },
                {
                  name: "Enterprises",
                  desc: "Orgs, projects, and permissions that scale.",
                  ai: "AI on a solid PM foundation—scales with you.",
                },
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
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Beta</h3>
                  <p className="mb-5 flex-1 text-sm text-gray-600">
                    Use the full platform close to no cost. Perfect for testing Afora with your
                    team.
                  </p>
                  <p className="mb-5 text-2xl font-bold text-gray-900">$0.01</p>
                  <button
                    onClick={() => router.push("/login")}
                    className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Get started now
                  </button>
                </div>
                {/* Team */}
                <div className="flex flex-col bg-afora/5 p-6">
                  <span className="mb-2 inline-block w-fit rounded-full bg-afora px-2.5 py-0.5 text-xs font-semibold text-white">
                    Popular
                  </span>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Team</h3>
                  <p className="mb-5 flex-1 text-sm text-gray-600">
                    Per user per month. Everyone on the team needs a seat to collaborate in one
                    place.
                  </p>
                  <p className="mb-5 flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-gray-900">$9</span>
                    <span className="text-sm text-gray-500">/user</span>
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
                    For large organizations. Custom pricing and terms—contact us to discuss your
                    needs.
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
        <section
          id="pricing"
          className="bg-gradient-to-br from-afora to-indigo-700 px-4 py-24 md:py-32"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-8 font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              More clarity. Fewer meetings. Start for free.
            </h2>
            <p className="mb-12 text-xl text-white/90 md:text-2xl">
              Ready to ship with less chaos? Try Afora free and see why teams choose one place for
              projects and people.
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
