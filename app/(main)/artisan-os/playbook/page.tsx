"use client";

import React from "react";
import { BookOpen, Package, ClipboardList, Sparkles, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    icon: Package,
    title: "Orders & Stock",
    subtitle: "Seamless Inventory Flow",
    description:
      "Quickly register products and track sales to keep inventory accurate.",
    expertTip:
      "Provide Product Name, Initial Stock, and Product Code for maximum precision.",
    trySaying: [
      '"Register \'Blue Ceramic Mug\' with 50 units. Code: MUG-001."',
      '"Sold 2 Shadow jackets to James."',
    ],
  },
  {
    icon: ClipboardList,
    title: "Operations Log",
    subtitle: "Your Internal Business Diary",
    description:
      "Keep internal notes, B2B requests, and production reminders separate from customer inquiries.",
    trySaying: [
      '"Record: E-mart requested 100 additional white mugs."',
      '"Note: Check fabric stock at Dongdaemun tomorrow."',
    ],
  },
  {
    icon: Sparkles,
    title: "Marketing",
    subtitle: "Localized Global Growth",
    description:
      "Generate optimized content for X, Instagram, TikTok, and Facebook.",
    keyAdvantage:
      "Supports EN, JP, CN, and KR. Unlike basic translators, our AI creates natural, localized phrasing and provides high-performing hashtags.",
    trySaying: [],
  },
  {
    icon: MessageCircle,
    title: "CS Master",
    subtitle: "Intelligent Customer Relations",
    description:
      "Log and track customer inquiries through stages (Open, Waiting, In Progress).",
    trySaying: [
      '"Mijong is asking for a delivery update on her shadow jacket."',
      '"James complained about the stitching on the pink pants."',
    ],
  },
];

export default function PlaybookPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:py-14">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="flex flex-col items-center justify-center font-serif font-bold text-[#2F5D50]">
            {/* Top Row: Icon + Main Title (Perfectly Centered) */}
            <div className="flex items-center gap-3 text-2xl md:text-3xl">
              <BookOpen className="h-8 w-8" />
              <span>Command Playbook</span>
            </div>
            {/* Bottom Row: Subtitle */}
            <span className="mt-2 text-lg md:text-xl opacity-80 font-normal">
              The Artisan OS Guide
            </span>
          </h1>
          <p className="mt-3 font-sans text-lg text-gray-600">
            We handle the rest, so you can focus on making.
          </p>
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-[#2F5D50]/20 bg-white/80 p-5 shadow-sm">
            <h2 className="font-serif font-semibold text-[#2F5D50]">
              The Brain of Your Studio
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-gray-700">
              The Command Center is for everything except physical production.
              Treat it like a real assistant: say what happened, what you need,
              or what a customer asked — we organize it into Orders, Operations
              Log, and CS Master so you stay in control without the busywork.
            </p>
          </div>
        </header>

        {/* Feature cards grid */}
        <section className="grid gap-6 sm:grid-cols-2">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2F5D50]/10 text-[#2F5D50]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-[#2F5D50]">
                      {card.title}
                    </h3>
                    <p className="text-xs font-medium text-gray-500">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
                <p className="mt-4 font-sans text-sm leading-relaxed text-gray-700">
                  {card.description}
                </p>
                
                {/* Expert Tip Section */}
                {card.expertTip && (
                  <p className="mt-3 rounded-lg border border-[#2F5D50]/20 bg-[#2F5D50]/5 px-3 py-2 font-sans text-xs font-medium text-[#2F5D50]">
                    <span className="font-semibold">Expert Tip:</span>{" "}
                    {card.expertTip}
                  </p>
                )}

                {/* Key Advantage Section (Special for Marketing) */}
                {card.keyAdvantage && (
                  <p className="mt-3 font-sans text-sm text-gray-700">
                    <span className="font-semibold text-[#2F5D50]">
                      Key Advantage:
                    </span>{" "}
                    Supports <strong>EN, JP, CN, and KR</strong>. Unlike basic
                    translators, our AI creates natural, localized phrasing and
                    provides high-performing hashtags.
                  </p>
                )}

                {/* Try Saying Section */}
                {card.trySaying && card.trySaying.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Try Saying
                    </p>
                    {card.trySaying.map((line, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800 shadow-inner"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}