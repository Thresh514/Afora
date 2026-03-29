"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Free",
    description: "Use the full platform at no cost. Perfect for trying Afora with your team.",
    price: null,
    unit: null,
    features: [
      "Full access to projects, stages & tasks",
      "AI roadmap generation",
      "Smart team matching",
      "Team compatibility analysis",
      "Unlimited members",
    ],
    cta: "Get started free",
    ctaHref: "/login",
    primary: false,
  },
  {
    name: "Team",
    description: "Per user per month. Everyone on the team needs a seat to collaborate in one place.",
    price: "$9",
    unit: "/user/month",
    features: [
      "Everything in Free",
      "Priority support",
      "Advanced analytics",
      "Custom workflows",
      "SSO & admin controls",
    ],
    cta: "Start free trial",
    ctaHref: "/login",
    primary: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations. Custom pricing and terms—contact us to discuss your needs.",
    price: "Custom",
    unit: null,
    features: [
      "Everything in Team",
      "Dedicated success manager",
      "SLA & compliance",
      "On-premise option",
      "Custom integrations",
    ],
    cta: "Contact sales",
    ctaHref: "#",
    primary: false,
  },
];

export default function PricePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50/50 pt-28 pb-20 md:pt-32 md:pb-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-16 text-center">
          <h1 className="mb-4 font-serif text-4xl font-bold text-gray-900 md:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600 md:text-2xl">
            B2B plans that scale with your team. Start free, upgrade when you’re ready.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-lg ${
                plan.primary
                  ? "border-afora ring-2 ring-afora/20"
                  : "border-gray-200"
              }`}
            >
              {plan.primary && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-afora px-3 py-0.5 text-sm font-semibold text-white">
                  Popular
                </span>
              )}
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{plan.name}</h2>
              <p className="mb-6 text-sm text-gray-600">{plan.description}</p>
              <div className="mb-6 flex items-baseline gap-1">
                {plan.price === "Custom" ? (
                  <span className="text-2xl font-bold text-gray-900">Custom</span>
                ) : plan.price ? (
                  <>
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    {plan.unit && (
                      <span className="text-gray-500">{plan.unit}</span>
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">$0</span>
                )}
              </div>
              <ul className="mb-8 flex-1 space-y-3 text-sm text-gray-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-afora">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.ctaHref === "/login" ? (
                <button
                  onClick={() => router.push("/login")}
                  className={`w-full rounded-xl py-3.5 text-sm font-semibold transition ${
                    plan.primary
                      ? "bg-afora text-white hover:bg-afora-hover"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  href={plan.ctaHref}
                  className="block w-full rounded-xl border border-gray-300 bg-white py-3.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-gray-500">
          All plans include full access to AI features. Need a custom quote?{" "}
          <Link href="#" className="font-medium text-afora hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </main>
  );
}
