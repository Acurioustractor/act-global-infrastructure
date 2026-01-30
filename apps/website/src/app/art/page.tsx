import CardGrid from "../../components/CardGrid";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const artPaths = [
  {
    title: "Artworks",
    description:
      "Commissioned pieces, installations, and artifacts from the studio.",
    href: "/art/artworks",
  },
  {
    title: "Exhibitions",
    description:
      "Pop-up shows, farm gallery exhibitions, and traveling installations.",
    href: "/art/exhibitions",
  },
  {
    title: "Artists",
    description:
      "People collaborating with ACT through residencies and commissions.",
    href: "/art/artists",
  },
  {
    title: "Residencies",
    description:
      "Artist residencies grounded in land, story, and community practice.",
    href: "/art/residencies",
  },
  {
    title: "Commissions",
    description:
      "Artwork briefs for social change, place-based storytelling, and research.",
    href: "/art/commissions",
  },
];

const artPrinciples = [
  "Art as an invitation to shared memory",
  "Practice that is accountable to place",
  "Storytelling that redistributes power",
  "Material experiments that honor the land",
];

export default function ArtPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Art"
        title="Art for social change and expression"
        description="Art is a core output of ACT. We translate listening into culture, invite new narratives, and commission work that shifts systems."
        actions={[
          { label: "Commission with us", href: "/art/commissions" },
          { label: "Residency info", href: "/art/residencies", variant: "outline" },
        ]}
        gradientClass="from-[#F4E8DD] via-[#E6CBB7] to-[#D1A788]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Art practice
          </p>
          <ul className="space-y-2">
            {artPrinciples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Art pathways"
          title="What we are making"
          description="Explore the formats we use to bring story and justice to life."
        />
        <CardGrid cards={artPaths} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" />
      </section>
    </div>
  );
}
