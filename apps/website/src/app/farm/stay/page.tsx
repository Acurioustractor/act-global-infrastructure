import GHLEmbed from "../../../components/GHLEmbed";
import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const stayOptions = [
  {
    title: "Residency cabins",
    description:
      "Quiet studios for artists, researchers, and collaborators staying on Country.",
  },
  {
    title: "Farmhouse stays",
    description:
      "Shared accommodation for longer working visits and field research.",
  },
  {
    title: "Group accommodation",
    description:
      "Flexible layouts for teams, retreats, and intergenerational gatherings.",
  },
];

const bookingUrl =
  "https://app.gohighlevel.com/v2/preview/FARM_STAY_BOOKING";

export default function FarmStayPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Stay"
        title="Accommodation on the farm"
        description="Slow down, stay close to the work, and join the rhythm of the land. Residencies and stays are designed for deep attention and collaboration."
        actions={[
          { label: "Request dates", href: "/contact" },
          { label: "Back to farm", href: "/farm", variant: "outline" },
        ]}
        gradientClass="from-[#F7F2E8] via-[#EADFCB] to-[#D7C4A2]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Residency focus
          </p>
          <ul className="space-y-2">
            <li>Creative and research residencies</li>
            <li>Community-led convenings</li>
            <li>Land-based learning and rest</li>
          </ul>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Stay options"
          title="Accommodation formats"
          description="A flexible mix of places to rest, make, and work with the landscape."
        />
        <CardGrid cards={stayOptions} className="grid gap-6 md:grid-cols-3" />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Bookings"
          title="Register interest"
          description="Placeholder for GHL booking form. Replace with the final accommodation intake."
        />
        <GHLEmbed
          title="Farm stay intake"
          description="Share your timing, purpose, and accessibility needs."
          src={bookingUrl}
        />
      </section>
    </div>
  );
}
