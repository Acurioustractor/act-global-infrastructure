import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const lcaaSteps = [
  {
    letter: "L",
    title: "Listen",
    subtitle: "Sit in silence to take in knowledge",
    description:
      "Deep listening to place, people, history, and community voice—especially those often ignored. Pay attention to ancestral teachers. Ground yourself in the wisdom that already exists before trying to add more.",
    practices: [
      "Spending time on Country before starting work",
      "Centering community voice in all decision-making",
      "Acknowledging what we don't know",
      "Learning from Indigenous knowledge systems",
    ],
    color: "from-green-50 to-emerald-50",
    borderColor: "border-green-300",
  },
  {
    letter: "C",
    title: "Curiosity",
    subtitle: "Think deeply, listen deeply, try to understand",
    description:
      "Ask better questions, prototype, test, learn. Lean into the unknown with open minds and hearts. Curiosity replaces certainty—we're not here to impose solutions but to discover them together.",
    practices: [
      "Asking 'what if' before 'how to'",
      "Rapid prototyping and iteration",
      "Learning from failure without shame",
      "Exploring edges and unconventional approaches",
    ],
    color: "from-amber-50 to-yellow-50",
    borderColor: "border-amber-300",
  },
  {
    letter: "A",
    title: "Action",
    subtitle: "We are makers who play and take chances",
    description:
      "Radically prototyping to form seedlings. Build, partner, deliver tangible outputs through innovative technologies, compelling stories, and immersive art. Action without listening is extraction; but listening without action is empty.",
    practices: [
      "Building with communities, not for them",
      "Shipping imperfect work and iterating",
      "Partnering across sectors and disciplines",
      "Creating tools designed to be handed over",
    ],
    color: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-300",
  },
  {
    letter: "A",
    title: "Art",
    subtitle: "The first form of revolution",
    description:
      "Translate change into culture, meaning, and storytelling. Challenge the status quo, provoke critical thinking, inspire collective action. Art is how change travels—it moves hearts before minds.",
    practices: [
      "Embedding artists in every project",
      "Using story as a tool for systems change",
      "Creating space for cultural production",
      "Valuing beauty alongside utility",
    ],
    color: "from-purple-50 to-violet-50",
    borderColor: "border-purple-300",
  },
];

export default function LCAAPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Methodology"
        title="Listen. Curiosity. Action. Art."
        description="LCAA is our framework for regenerative innovation. It keeps us grounded in listening, curious in exploration, committed to action, and expressive through art."
        actions={[
          { label: "Our Principles", href: "/principles" },
          { label: "See Projects", href: "/projects", variant: "outline" },
        ]}
      >
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Why methodology matters
          </p>
          <p>
            LCAA ensures we don't skip the hard work of listening or rush past the
            creative work of meaning-making. It's a cycle, not a checklist.
          </p>
        </div>
      </PageHero>

      <section className="space-y-12">
        {lcaaSteps.map((step, index) => (
          <div
            key={step.title + index}
            className={`rounded-3xl border ${step.borderColor} bg-gradient-to-br ${step.color} p-8 md:p-12`}
          >
            <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
              <div className="flex items-start">
                <span className="text-8xl font-bold text-[#2F3E2E]/20 font-[var(--font-display)]">
                  {step.letter}
                </span>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                    {step.title}
                  </h2>
                  <p className="text-lg text-[#4CAF50] font-medium">
                    {step.subtitle}
                  </p>
                </div>
                <p className="text-base text-[#4D3F33] max-w-2xl">
                  {step.description}
                </p>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6B5A45]">
                    In Practice
                  </h3>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {step.practices.map((practice) => (
                      <li
                        key={practice}
                        className="flex items-start gap-2 text-sm text-[#4D3F33]"
                      >
                        <span className="text-[#4CAF50] mt-1">•</span>
                        {practice}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Application"
          title="LCAA in action"
          description="How the methodology shows up across our projects."
        />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              At Black Cockatoo Valley
            </h3>
            <p className="text-sm text-[#4D3F33]">
              We listened to the land for years before building anything. Curiosity
              led us to partner with ecologists. Action means restoration work.
              Art emerges through residencies and cultural programming.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              In Empathy Ledger
            </h3>
            <p className="text-sm text-[#4D3F33]">
              Listening to communities about consent and ownership. Curiosity about
              blockchain for sovereignty. Action in building the platform. Art in
              how stories are told and shared.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              In JusticeHub
            </h3>
            <p className="text-sm text-[#4D3F33]">
              Listening to young people and families. Curiosity about what works in
              justice innovation. Action in building tools and networks. Art in
              amplifying youth voices and stories.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
            It's a cycle, not a checklist
          </h2>
          <p className="text-base text-[#4D3F33]">
            LCAA isn't linear. We return to listening throughout every project.
            Curiosity doesn't stop when action begins. Art informs how we listen.
            The methodology keeps us accountable to community while staying creative
            and adaptive.
          </p>
          <div className="flex justify-center gap-4 text-4xl">
            <span>🌱</span>
            <span>→</span>
            <span>🔍</span>
            <span>→</span>
            <span>🔨</span>
            <span>→</span>
            <span>🎨</span>
            <span>→</span>
            <span>🌱</span>
          </div>
        </div>
      </section>
    </div>
  );
}
