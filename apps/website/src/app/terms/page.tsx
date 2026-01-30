import PageHero from "../../components/PageHero";

export default function TermsPage() {
  return (
    <div className="space-y-16">
      <PageHero
        eyebrow="Terms"
        title="Terms of use"
        description="This page will outline the terms for using ACT sites and services."
        actions={[{ label: "Contact us", href: "/contact" }]}
      />

      <section className="rich-text rounded-3xl border border-[#E3D4BA] bg-white/70 p-8 text-sm text-[#4D3F33]">
        <h2>Draft placeholder</h2>
        <p>
          Terms will cover site usage, content ownership, and the responsibilities
          of partners and contributors.
        </p>
        <p>
          We will include details for booking agreements, residency policies, and
          event participation guidelines.
        </p>
      </section>
    </div>
  );
}
