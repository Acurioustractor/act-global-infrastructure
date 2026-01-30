import Link from "next/link";
import type { ReactNode } from "react";

type HeroAction = {
  label: string;
  href: string;
  variant?: "solid" | "outline";
};

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: HeroAction[];
  gradientClass?: string;
  className?: string;
  panelClassName?: string;
  children?: ReactNode;
};

const actionVariants = {
  solid:
    "rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#3D9143]",
  outline:
    "rounded-full border border-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#2F3E2E] transition hover:bg-[#E5F4E4]",
};

export default function PageHero({
  eyebrow,
  title,
  description,
  actions,
  gradientClass,
  className,
  panelClassName,
  children,
}: PageHeroProps) {
  const hasPanel = Boolean(children);

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br ${
        gradientClass ?? "from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2]"
      } p-8 md:p-12 ${className ?? ""}`}
    >
      <div
        className={`grid gap-8 ${hasPanel ? "lg:grid-cols-[1.2fr_0.8fr]" : ""}`}
      >
        <div className="space-y-6">
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.4em] text-[#6B5A45]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold leading-tight text-[#2F3E2E] md:text-5xl font-[var(--font-display)]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-base text-[#4D3F33] md:text-lg">
              {description}
            </p>
          ) : null}
          {actions && actions.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={
                    actionVariants[action.variant ?? "solid"] ??
                    actionVariants.solid
                  }
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {hasPanel ? (
          <div
            className={
              panelClassName ??
              "rounded-3xl border border-[#D8C7A5] bg-white/70 p-6 text-sm text-[#4D3F33]"
            }
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
