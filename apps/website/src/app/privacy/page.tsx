import PageHero from "../../components/PageHero";

export default function PrivacyPage() {
  return (
    <div className="space-y-16">
      <PageHero
        eyebrow="Privacy"
        title="Privacy policy"
        description="This policy will outline how ACT handles data, consent, and cultural protocols."
        actions={[{ label: "Contact us", href: "/contact" }]}
      />

      <section className="rich-text rounded-3xl border border-[#E3D4BA] bg-white/70 p-8 text-sm text-[#4D3F33]">
        <h2>Draft placeholder</h2>
        <p>
          This page will describe how we collect, store, and use information
          across ACT projects, including consent processes for stories and media.
        </p>
        <p>
          We will add details on data storage, cookies, and how to request
          updates or deletions.
        </p>
      </section>
    </div>
  );
}
