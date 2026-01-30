type GHLEmbedProps = {
  title: string;
  src: string;
  description?: string;
  height?: number;
};

export default function GHLEmbed({
  title,
  src,
  description,
  height = 640,
}: GHLEmbedProps) {
  return (
    <div className="rounded-2xl border border-[#D8C7A5] bg-white/80 p-5 shadow-[0_18px_45px_rgba(50,42,31,0.12)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm text-[#5A4A3A]">{description}</p>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E7DBC6] bg-[#F6F1E7]">
        <iframe
          title={title}
          src={src}
          loading="lazy"
          className="h-full w-full"
          style={{ height }}
        />
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#7A6A55]">
        GHL embed placeholder
      </p>
    </div>
  );
}
