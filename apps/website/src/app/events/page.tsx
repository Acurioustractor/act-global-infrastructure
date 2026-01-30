import CardGrid from "../../components/CardGrid";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const eventTypes = [
  {
    title: "Community meals",
    description:
      "Seasonal dinners that connect harvest, art, and shared governance.",
  },
  {
    title: "Workshops",
    description:
      "Learning sessions on land care, justice practice, and creative inquiry.",
  },
  {
    title: "Residency showcases",
    description:
      "Open studios and conversations with artists and researchers on site.",
  },
];

export default function EventsPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Events"
        title="Gatherings and invitations"
        description="Upcoming events, workshops, and farm gatherings will live here."
        actions={[
          { label: "Join the list", href: "/contact" },
          { label: "Visit the farm", href: "/farm", variant: "outline" },
        ]}
        gradientClass="from-[#F6F1E7] via-[#EADFCC] to-[#D7C4A2]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Calendar note
          </p>
          <p>
            This schedule will pull from the registry once the event system is
            connected. For now, use this page as a placeholder.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Formats"
          title="Event types"
          description="A mix of gatherings that serve the community and the land."
        />
        <CardGrid cards={eventTypes} className="grid gap-6 md:grid-cols-3" />
      </section>
    </div>
  );
}
