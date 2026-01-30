import GHLEmbed from "../../components/GHLEmbed";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const contactUrl =
  "https://app.gohighlevel.com/v2/preview/CONTACT_FORM_ID";

export default function ContactPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Contact"
        title="Start the conversation"
        description="Reach out to collaborate, visit, or bring a new project into the ACT ecosystem."
        actions={[
          { label: "Explore projects", href: "/projects" },
          { label: "Visit the farm", href: "/farm", variant: "outline" },
        ]}
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Studio contact
          </p>
          <p>
            Email: <span className="font-semibold">hi@act.place</span>
          </p>
          <p>Location: Jinibara Country, Black Cockatoo Valley.</p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="GHL"
          title="Contact form"
          description="Placeholder for the primary contact form. Replace with final URL."
        />
        <GHLEmbed
          title="Contact ACT"
          description="Tell us about your project, partnership, or residency idea."
          src={contactUrl}
        />
      </section>
    </div>
  );
}
