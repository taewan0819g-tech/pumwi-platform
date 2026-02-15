"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Package, ClipboardList, Sparkles, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const CARD_KEYS = [
  { key: "orders" as const, icon: Package },
  { key: "operations" as const, icon: ClipboardList },
  { key: "marketing" as const, icon: Sparkles },
  { key: "cs" as const, icon: MessageCircle },
];

export default function PlaybookPage() {
  const t = useTranslations("playbook");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:py-14">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="flex flex-col items-center justify-center font-serif font-bold text-[#2F5D50]">
            <div className="flex items-center gap-3 text-2xl md:text-3xl">
              <BookOpen className="h-8 w-8" />
              <span>{t("header.title")}</span>
            </div>
            <span className="mt-2 text-lg md:text-xl opacity-80 font-normal">
              {t("header.subtitle")}
            </span>
          </h1>
          <p className="mt-3 font-sans text-lg text-gray-600">
            {t("header.description")}
          </p>
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-[#2F5D50]/20 bg-white/80 p-5 shadow-sm">
            <h2 className="font-serif font-semibold text-[#2F5D50]">
              {t("intro_box.title")}
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-gray-700">
              {t("intro_box.description")}
            </p>
          </div>
        </header>

        {/* Feature cards grid */}
        <section className="grid gap-6 sm:grid-cols-2">
          {CARD_KEYS.map(({ key, icon: Icon }) => {
            const hasTrySaying = key !== "marketing";
            const example1 = hasTrySaying ? t(`cards.${key}.example_1`) : "";
            const example2 = hasTrySaying ? t(`cards.${key}.example_2`) : "";
            const hasExamples = hasTrySaying && (example1 || example2);

            return (
              <div
                key={key}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2F5D50]/10 text-[#2F5D50]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-[#2F5D50]">
                      {t(`cards.${key}.title`)}
                    </h3>
                    <p className="text-xs font-medium text-gray-500">
                      {t(`cards.${key}.subtitle`)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 font-sans text-sm leading-relaxed text-gray-700">
                  {t(`cards.${key}.description`)}
                </p>

                {/* Try Saying Section (orders, operations, cs) */}
                {hasTrySaying && hasExamples && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t(`cards.${key}.try_saying_label`)}
                    </p>
                    <div className="space-y-2">
                      {example1 && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800 shadow-inner">
                          {example1}
                        </div>
                      )}
                      {example2 && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800 shadow-inner">
                          {example2}
                        </div>
                      )}
                    </div>
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
