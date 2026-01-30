import Link from "next/link";
import GHLEmbed from "../components/GHLEmbed";
import { projects } from "../data/projects";

const oneLiners = [
  "A regenerative innovation studio stewarding a working farm on Jinibara Country.",
  "Cultivating seeds of justice, art, and shared governance from a working farm.",
  "An innovation studio growing co-stewardship through land, story, and action.",
  "A safe play space for curiosity and care, rooted in regenerative farming.",
];

const methodSteps = [
  { title: "Listen", detail: "Pay attention to place, people, and history." },
  { title: "Curiosity", detail: "Ask better questions and test new ideas." },
  { title: "Action", detail: "Prototype, partner, and build shared tools." },
  { title: "Art", detail: "Translate change into culture and meaning." },
];

const expressions = [
  {
    title: "Residencies",
    detail: "Accommodation and studio space for deep inquiry on the farm.",
  },
  {
    title: "Events",
    detail: "Gatherings, workshops, and meals that grow relationships.",
  },
  {
    title: "Artworks",
    detail: "Commissions, installations, and storytelling outputs.",
  },
  {
    title: "Harvest Shares",
    detail: "CSA boxes and seasonal celebrations from the valley.",
  },
];

const fields = [
  "Justice innovation and civic imagination",
  "Storytelling, listening, and memory keeping",
  "Regenerative land care and food systems",
  "Art, design, and cultural practice",
  "Shared governance and community stewardship",
  "Education, play, and intergenerational learning",
];

const impactPoints = [
  "A just, equitable, regenerative world anchored in place.",
  "Community-led stewardship that grows shared agency.",
  "Creative economies that return value to people and land.",
];

const partnerTypes = [
  "Community partners and neighbors",
  "Artists, researchers, and cultural workers",
  "Funders, philanthropies, and aligned institutions",
  "Regional collaborators and land-based initiatives",
];

const contactFormUrl =
  "https://app.gohighlevel.com/v2/preview/CONTACT_FORM_ID";
const csaBookingUrl =
  "https://app.gohighlevel.com/v2/preview/CSA_BOOKING_FORM_ID";

export default function HomePage() {
  return (
    <div className="space-y-24">
      <section
        id="hero"
        className="relative overflow-hidden rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12"
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-[#6B5A45]">
              Welcome to The ACT Farm
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-[#2F3E2E] md:text-5xl font-[var(--font-display)]">
              A regenerative innovation studio stewarding a working farm on
              Jinibara Country.
            </h1>
            <p className="max-w-xl text-base text-[#4D3F33] md:text-lg">
              We cultivate seeds of impact, invite safe play for imagination, and
              turn listening into collective action. This is a living lab for
              co-stewardship, grounded in land care and creative practice.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="rounded-full bg-[#4CAF50] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#3D9143]"
              >
                Get in touch
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-[#4CAF50] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#2F3E2E] transition hover:bg-[#E5F4E4]"
              >
                More about us
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] w-full rounded-3xl border border-[#CDBA98] bg-[radial-gradient(circle_at_top,#FDF9F0,#D8C4A1)] p-6 shadow-[0_20px_50px_rgba(50,42,31,0.18)]">
              <div className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-[#BFA883] bg-[#F7F0E2]/70 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-[#6E5C45]">
                  Farm visual placeholder
                </p>
                <p className="text-sm text-[#4D3F33]">
                  Replace with hero imagery: rows, creek, seedbeds, and the
                  valley horizon.
                </p>
                <div className="mt-8 h-24 rounded-2xl bg-gradient-to-r from-[#4CAF50]/70 via-[#86C47A]/70 to-[#CBB58E]/70" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Identity
          </p>
          <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
            A working farm, a studio, and a shared promise.
          </h2>
          <p className="text-sm text-[#4D3F33] md:text-base">
            ACT is stewarding Black Cockatoo Valley as a regenerative innovation
            studio. We listen to community needs, prototype new civic futures,
            and create spaces where governance can become shared work.
          </p>
          <div className="rounded-2xl border border-[#E3D4BA] bg-white/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              One-liner options
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {oneLiners.map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-[#E7DBC6] bg-[#F8F3EA] p-4 text-sm text-[#3F3328]"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Promise
          </p>
          <div className="rounded-3xl border border-[#D8C7A5] bg-gradient-to-br from-[#F5F0E6] via-[#EFE3CF] to-[#E2D1B4] p-6 shadow-[0_15px_35px_rgba(50,42,31,0.12)]">
            <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              Growing co-stewardship
            </h3>
            <p className="mt-3 text-sm text-[#4D3F33]">
              We are moving toward shared governance with community, artists,
              and partners. The farm is our commons, and the studio is our
              toolkit for practicing care, accountability, and collective power.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4 text-sm text-[#4D3F33]">
                Co-created governance experiments
              </div>
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4 text-sm text-[#4D3F33]">
                Land-based reciprocity and learning
              </div>
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4 text-sm text-[#4D3F33]">
                Shared wealth and benefit
              </div>
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4 text-sm text-[#4D3F33]">
                Culture led by community voices
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              Method
            </p>
            <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
              Listen - Curiosity - Action - Art
            </h2>
          </div>
          <p className="max-w-lg text-sm text-[#4D3F33]">
            LCAA keeps us grounded: we start by listening, follow curiosity into
            discovery, take action with partners, and translate the learning
            into art that can travel further.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {methodSteps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-[#E3D4BA] bg-white/60 p-4"
            >
              <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-[#4D3F33]">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="outputs" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              Active Seeds
            </p>
            <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
              Outputs and initiatives
            </h2>
          </div>
          <p className="max-w-lg text-sm text-[#4D3F33]">
            These are the current seeds in the ground. Each output is designed
            to grow alongside community and place.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="group flex h-full flex-col justify-between rounded-3xl border border-[#E1D3BA] bg-white/70 p-6 transition hover:-translate-y-1 hover:border-[#4CAF50] hover:shadow-[0_18px_45px_rgba(50,42,31,0.12)]"
            >
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                  Output
                </p>
                <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                  {project.title}
                </h3>
                <p className="text-sm text-[#4D3F33]">{project.tagline}</p>
                <p className="text-xs text-[#6B5A45]">{project.description}</p>
                {project.slug === "black-cockatoo-valley" ? (
                  <ul className="mt-4 space-y-2 text-xs text-[#4D3F33]">
                    <li>R&D, community engagement, residencies</li>
                    <li>Accommodation and harvest toward CSA</li>
                    <li>Exploring regional collaboration models</li>
                  </ul>
                ) : null}
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#4CAF50]">
                Explore seed
                <span aria-hidden="true">-&gt;</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="art"
        className="grid gap-8 rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br from-[#F4E8DD] via-[#E6CBB7] to-[#D1A788] p-8 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Art for social change
          </p>
          <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
            Translating listening into culture
          </h2>
          <p className="text-sm text-[#4D3F33]">
            Art is a core output of ACT. We commission work, host residencies,
            and share exhibitions that carry stories further than reports.
          </p>
          <Link
            href="/art"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
          >
            Explore art
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
        <div className="rounded-3xl border border-dashed border-[#BFA883] bg-[#F7F0E2]/70 p-6 text-sm text-[#4D3F33]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Art visual placeholder
          </p>
          <p className="mt-3">
            Replace with exhibition imagery, studio moments, or commission
            documentation.
          </p>
          <div className="mt-6 h-40 rounded-2xl bg-gradient-to-r from-[#B86E4B]/70 via-[#D1A47D]/70 to-[#E7C9A6]/70" />
        </div>
      </section>

      <section
        id="farm"
        className="grid gap-8 rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br from-[#F7F2E8] via-[#EFE2CB] to-[#E1CEB0] p-8 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Black Cockatoo Valley
          </p>
          <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
            The farm as living lab
          </h2>
          <p className="text-sm text-[#4D3F33]">
            Black Cockatoo Valley is stewarded by ACT as a working farm, R&D
            site, and gathering place. We host residencies and accommodation,
            harvest toward CSA shares, and test new community models with
            regional partners.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              Stewarded by ACT
            </span>
            <span className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2F3E2E]">
              Residencies + accommodation
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-dashed border-[#BFA883] bg-[#F7F0E2]/70 p-6 text-sm text-[#4D3F33]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Farm visual placeholder
          </p>
          <p className="mt-3">
            Replace with aerial valley image, paddocks, orchard, or creek.
          </p>
          <div className="mt-6 h-40 rounded-2xl bg-gradient-to-r from-[#3E6B3E]/70 via-[#7DBA6A]/70 to-[#C3AF8A]/70" />
        </div>
      </section>

      <section id="expressions" className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Expressions
          </p>
          <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
            How the work shows up
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {expressions.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E3D4BA] bg-white/70 p-5"
            >
              <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-[#4D3F33]">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="fields" className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Fields
          </p>
          <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
            The areas we tend
          </h2>
          <p className="text-sm text-[#4D3F33]">
            These fields of practice guide our collaborations across justice,
            story, land, and art.
          </p>
        </div>
        <div className="rounded-3xl border border-[#E3D4BA] bg-white/60 p-6">
          <ul className="grid gap-3 text-sm text-[#4D3F33] sm:grid-cols-2">
            {fields.map((field) => (
              <li key={field} className="rounded-2xl bg-[#F7F2E8] p-3">
                {field}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="partners" className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
          <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
            Impact we are growing
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-[#4D3F33]">
            {impactPoints.map((point) => (
              <li key={point} className="rounded-2xl bg-[#F7F2E8] p-3">
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
          <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
            Partnerships
          </h3>
          <p className="mt-2 text-sm text-[#4D3F33]">
            We work with people ready to build a just, equitable, regenerative
            world.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-[#4D3F33]">
            {partnerTypes.map((partner) => (
              <li key={partner} className="rounded-2xl bg-[#F7F2E8] p-3">
                {partner}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              Connect
            </p>
            <h2 className="text-2xl font-semibold text-[#2F3E2E] md:text-3xl font-[var(--font-display)]">
              GHL CTAs and forms
            </h2>
          </div>
          <p className="max-w-lg text-sm text-[#4D3F33]">
            Placeholder embeds for contact, CSA, and residency booking. Replace
            with the final GHL form URLs.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <GHLEmbed
            title="Contact ACT"
            description="Introduce yourself, share a project, or start a partnership."
            src={contactFormUrl}
          />
          <GHLEmbed
            title="CSA + Residency Booking"
            description="Register interest for harvest shares or accommodation."
            src={csaBookingUrl}
          />
        </div>
      </section>
    </div>
  );
}
