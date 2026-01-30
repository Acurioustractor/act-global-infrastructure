import Link from "next/link";

type Card = {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: React.ReactNode;
  href?: string;
  ctaLabel?: string;
  image?: string;
  theme?: string;
};

type CardGridProps = {
  cards: Card[];
  className?: string;
  cardClassName?: string;
};

export default function CardGrid({
  cards,
  className,
  cardClassName,
}: CardGridProps) {
  const gridClass =
    className ?? "grid gap-6 md:grid-cols-2 lg:grid-cols-3";
  const baseCardClass =
    cardClassName ??
    "group flex h-full flex-col justify-between rounded-3xl border border-[#E1D3BA] bg-white/70 p-6 transition hover:-translate-y-1 hover:border-[#4CAF50] hover:shadow-[0_18px_45px_rgba(50,42,31,0.12)]";

  return (
    <div className={gridClass}>
      {cards.map((card) => {
        const content = card.image ? (
          // Image card layout
          <>
            {card.image && (
              <div className="relative h-48 w-full overflow-hidden rounded-t-3xl">
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <div className="flex flex-col justify-between p-6 flex-1">
              <div className="space-y-2">
                {card.theme && (
                  <span className="inline-block rounded-full bg-[#F6F1E7] px-3 py-1 text-xs font-medium text-[#6B5A45]">
                    {card.theme}
                  </span>
                )}
                <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                  {card.title}
                </h3>
                {card.description && (
                  <p className="text-sm text-[#4D3F33] line-clamp-2">
                    {card.description}
                  </p>
                )}
              </div>
              {card.href && (
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#4CAF50]">
                  {card.ctaLabel ?? "Explore"}
                  <span aria-hidden="true">→</span>
                </span>
              )}
            </div>
          </>
        ) : (
          // Text-only card layout (original)
          <>
            <div className="space-y-3">
              {card.eyebrow && (
                <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                  {card.eyebrow}
                </p>
              )}
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {card.title}
              </h3>
              {card.description && (
                <p className="text-sm text-[#4D3F33]">{card.description}</p>
              )}
              {card.meta && (
                <div className="text-xs text-[#6B5A45]">{card.meta}</div>
              )}
            </div>
            {card.href && (
              <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#4CAF50]">
                {card.ctaLabel ?? "Explore"}
                <span aria-hidden="true">→</span>
              </span>
            )}
          </>
        );

        const cardClass = card.image
          ? "group flex h-full flex-col overflow-hidden rounded-3xl border border-[#E1D3BA] bg-white transition hover:-translate-y-1 hover:border-[#4CAF50] hover:shadow-[0_18px_45px_rgba(50,42,31,0.12)]"
          : baseCardClass;

        return card.href ? (
          <Link key={card.title} href={card.href} className={cardClass}>
            {content}
          </Link>
        ) : (
          <div key={card.title} className={cardClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
