export type BlockType =
  | "hero"
  | "rich_text"
  | "image"
  | "gallery"
  | "video"
  | "quote"
  | "cta"
  | "stats"
  | "cards"
  | "form_embed";

export const blockTypeOptions: { value: BlockType; label: string }[] = [
  { value: "hero", label: "Hero" },
  { value: "rich_text", label: "Rich text" },
  { value: "image", label: "Image" },
  { value: "gallery", label: "Gallery" },
  { value: "video", label: "Video" },
  { value: "quote", label: "Quote" },
  { value: "cta", label: "CTA" },
  { value: "stats", label: "Stats" },
  { value: "cards", label: "Cards" },
  { value: "form_embed", label: "Form embed" },
];

export const defaultBlockData: Record<BlockType, Record<string, unknown>> = {
  hero: {
    headline: "",
    subhead: "",
    image_media_id: "",
    cta: { label: "", href: "" },
  },
  rich_text: {
    html: "<p></p>",
  },
  image: {
    media_id: "",
    alt: "",
    caption: "",
  },
  gallery: {
    media_ids: [],
    layout: "grid",
  },
  video: {
    media_id: "",
    poster_media_id: "",
    caption: "",
    autoplay: false,
  },
  quote: {
    quote: "",
    attribution: "",
  },
  cta: {
    headline: "",
    body: "",
    button: { label: "", href: "" },
  },
  stats: {
    items: [{ label: "", value: "" }],
  },
  cards: {
    items: [{ title: "", body: "", media_id: "" }],
  },
  form_embed: {
    title: "",
    embed_url: "",
  },
};
