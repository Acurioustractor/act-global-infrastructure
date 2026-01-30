type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "items-center text-center" : "";

  return (
    <div className={`space-y-3 ${alignment}`}>
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm text-[#4D3F33] md:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
