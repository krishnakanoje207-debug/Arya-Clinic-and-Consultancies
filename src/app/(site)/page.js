import { getLocale } from "next-intl/server";
import {
  getProfile,
  getPublishedCases,
  getPublishedFaqs,
  getPublishedTestimonials,
  getResearchSection,
  getServices,
} from "@/lib/content";
import { getSettings } from "@/lib/settings";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Conditions from "@/components/sections/Conditions";
import Services from "@/components/sections/Services";
import WhyArya from "@/components/sections/WhyArya";
import SuccessStories from "@/components/sections/SuccessStories";
import Testimonials from "@/components/sections/Testimonials";
import ResearchSection from "@/components/sections/ResearchSection";
import Faq from "@/components/sections/Faq";
import Contact from "@/components/sections/Contact";
import JsonLd, { FaqJsonLd } from "@/components/JsonLd";
import Reveal from "@/components/Reveal";

// Content is DB-driven and safe to cache; revalidate hourly so admin edits
// surface without redeploys while keeping Neon compute-hours low.
export const revalidate = 3600;

export default async function HomePage() {
  const locale = await getLocale();
  const [profile, services, cases, testimonials, faqs, research, settings] =
    await Promise.all([
      getProfile(),
      getServices(),
      getPublishedCases(),
      getPublishedTestimonials(),
      getPublishedFaqs(),
      getResearchSection(),
      getSettings(),
    ]);

  return (
    <>
      <JsonLd profile={profile} settings={settings} />
      <FaqJsonLd faqs={faqs} locale={locale} />
      <Hero profile={profile} locale={locale} />
      <Reveal>
        <About profile={profile} locale={locale} />
      </Reveal>
      <Reveal>
        <Conditions />
      </Reveal>
      <Reveal>
        <Services services={services} locale={locale} />
      </Reveal>
      <Reveal>
        <WhyArya />
      </Reveal>
      <Reveal>
        <SuccessStories cases={cases} locale={locale} />
      </Reveal>
      <Reveal>
        <Testimonials testimonials={testimonials} locale={locale} />
      </Reveal>
      {research.published ? (
        <Reveal>
          <ResearchSection items={research.items} locale={locale} />
        </Reveal>
      ) : null}
      <Reveal>
        <Faq faqs={faqs} locale={locale} />
      </Reveal>
      <Reveal>
        <Contact settings={settings} />
      </Reveal>
    </>
  );
}
