import CardGrid from "../../components/CardGrid";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const identityCards = [
  {
    title: "Regenerative innovation studio",
    description:
      "We steward a working farm while prototyping new forms of governance and care.",
  },
  {
    title: "Jinibara Country",
    description:
      "We acknowledge Country and are committed to respectful, reciprocal practice.",
  },
  {
    title: "Co-stewardship",
    description:
      "Our promise is to grow shared governance with community partners.",
  },
];

const methodSteps = [
  {
    title: "Listen",
    description: "Ground in place, people, and lived experience.",
  },
  {
    title: "Curiosity",
    description: "Ask better questions and test new ideas.",
  },
  {
    title: "Action",
    description: "Prototype with partners and build shared tools.",
  },
  {
    title: "Art",
    description: "Translate change into culture and meaning.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="About ACT"
        title="A regenerative innovation studio"
        description="ACT is a working farm, studio, and commons. We host projects that grow justice, art, and shared governance."
        actions={[
          { label: "Explore projects", href: "/projects" },
          { label: "Meet the farm", href: "/farm", variant: "outline" },
        ]}
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Our promise
          </p>
          <p>
            We are committed to co-stewardship and community accountability in
            everything we grow.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Identity"
          title="Who we are"
          description="The guiding commitments that shape ACT and the farm."
        />
        <CardGrid cards={identityCards} className="grid gap-6 md:grid-cols-3" />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Method"
          title="Listen - Curiosity - Action - Art"
          description="LCAA keeps the studio grounded in listening and creative action."
        />
        <CardGrid cards={methodSteps} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" />
      </section>
    </div>
  );
}
