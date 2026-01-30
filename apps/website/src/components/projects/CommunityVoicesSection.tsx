/**
 * Community Voices Section
 * Displays featured storytellers and stories from Empathy Ledger
 * Uses tag-based system where storytellers opt-in and ACT admins approve
 */

import type {
  FeaturedStoryteller,
  FeaturedStory,
} from '@/lib/empathy-ledger-featured';

interface CommunityVoicesSectionProps {
  storytellers: FeaturedStoryteller[];
  stories: FeaturedStory[];
  projectTitle: string;
}

export function CommunityVoicesSection({
  storytellers,
  stories,
  projectTitle,
}: CommunityVoicesSectionProps) {
  if (storytellers.length === 0 && stories.length === 0) {
    return null; // Don't show section if no content
  }

  return (
    <section className="space-y-12">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
          Community Voices
        </p>
        <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E] md:text-3xl">
          Stories from this work
        </h2>
        <p className="mt-4 text-[#5A6B4D]">
          Real stories from people connected to {projectTitle}, shared through
          Empathy Ledger
        </p>
      </div>

      {/* Featured Storytellers */}
      {storytellers.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-[var(--font-display)] text-xl font-semibold text-[#2F3E2E]">
            Featured Storytellers
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {storytellers.map((storyteller) => (
              <div
                key={storyteller.storyteller_id}
                className="rounded-[24px] border border-[#E3D4BA] bg-white p-6 transition-shadow hover:shadow-lg"
              >
                {storyteller.profile_image_url && (
                  <img
                    src={storyteller.profile_image_url}
                    alt={
                      storyteller.display_name ||
                      storyteller.full_name ||
                      'Storyteller'
                    }
                    className="mb-4 h-24 w-24 rounded-full object-cover"
                  />
                )}
                <h4 className="font-[var(--font-display)] text-lg font-semibold text-[#2F3E2E]">
                  {storyteller.display_name || storyteller.full_name}
                </h4>
                {storyteller.current_role && storyteller.current_organization && (
                  <p className="mt-1 text-sm text-[#6B5A45]">
                    {storyteller.current_role} at{' '}
                    {storyteller.current_organization}
                  </p>
                )}
                {storyteller.custom_tagline && (
                  <p className="mt-2 text-sm italic text-[#7A9B76]">
                    {storyteller.custom_tagline}
                  </p>
                )}
                <p className="mt-3 text-sm text-[#5A6B4D]">
                  {storyteller.featured_bio}
                </p>
                {storyteller.featured_story_count > 0 && (
                  <p className="mt-3 text-xs text-[#6B5A45]">
                    {storyteller.featured_story_count}{' '}
                    {storyteller.featured_story_count === 1 ? 'story' : 'stories'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Stories */}
      {stories.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-[var(--font-display)] text-xl font-semibold text-[#2F3E2E]">
            Featured Stories
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {stories.map((story) => (
              <a
                key={story.story_id}
                href={`${process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL}/stories/${story.story_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-[24px] border border-[#E3D4BA] bg-white overflow-hidden transition-all hover:shadow-lg hover:border-[#7A9B76]"
              >
                {story.featured_image_url && (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={story.featured_image_url}
                      alt={story.story_title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {story.featured_as_hero && (
                      <div className="absolute top-4 right-4 rounded-full bg-[#B85C38] px-3 py-1 text-xs font-medium text-white">
                        Featured
                      </div>
                    )}
                  </div>
                )}
                <div className="p-6">
                  <h4 className="font-[var(--font-display)] text-lg font-semibold text-[#2F3E2E] group-hover:text-[#7A9B76]">
                    {story.story_title}
                  </h4>
                  <p className="mt-1 text-sm text-[#6B5A45]">
                    by {story.storyteller_display_name || story.storyteller_name}
                  </p>
                  {story.excerpt && (
                    <p className="mt-3 text-sm text-[#5A6B4D] line-clamp-3">
                      {story.excerpt}
                    </p>
                  )}
                  {story.themes && story.themes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {story.themes.slice(0, 3).map((theme) => (
                        <span
                          key={theme}
                          className="rounded-full bg-[#F6F1E7] px-3 py-1 text-xs text-[#6B5A45]"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-sm font-medium text-[#7A9B76] group-hover:underline">
                    Read full story →
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Link to Empathy Ledger */}
      <div className="text-center rounded-[24px] border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] to-[#E7DDC7] p-8">
        <p className="text-sm text-[#6B5A45]">
          These stories are powered by{' '}
          <a
            href={process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#B85C38] hover:underline"
          >
            Empathy Ledger
          </a>
          , a platform for community storytelling and Indigenous data sovereignty.
        </p>
      </div>
    </section>
  );
}
