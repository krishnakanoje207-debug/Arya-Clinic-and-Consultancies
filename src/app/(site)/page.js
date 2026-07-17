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
import HealingPath from "@/components/sections/HealingPath";
import Conditions from "@/components/sections/Conditions";
import SelfCheck from "@/components/sections/SelfCheck";
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

  // Optional consultation fee on the hero Book CTA (off until the client
  // enables it in Settings — Drugs & Magic Remedies / ASCI-safe: a fee, not
  // a claim). Uses the first non-follow-up service fee.
  const firstConsult = services.find((s) => !s.isFollowUp) || services[0];
  const showFee =
    settings.show_fee_on_cta === true || settings.show_fee_on_cta === "true";
  const bookFee = showFee && firstConsult?.feeInr ? firstConsult.feeInr : null;

  // Full-viewport photo behind the transparent Hero + About "windows".
  // A fixed layer (not background-attachment:fixed — janky on mobile); every
  // other section carries an opaque bg band so the image shows only here.
  const bgImage = settings.home_bg_image || "/photos/clinic-bg.jpg";

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bgImage} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-cream/45" />
      </div>

      <JsonLd profile={profile} settings={settings} />
      <FaqJsonLd faqs={faqs} locale={locale} />

      <Hero profile={profile} locale={locale} bookFee={bookFee} />
      <Reveal>
        <Conditions />
      </Reveal>
      <Reveal>
        <SuccessStories cases={cases} locale={locale} />
      </Reveal>
      <Reveal>
        <HealingPath />
      </Reveal>
      <Reveal>
        <Services services={services} locale={locale} />
      </Reveal>
      <Reveal>
        <WhyArya />
      </Reveal>
      <Reveal>
        <Testimonials testimonials={testimonials} locale={locale} />
      </Reveal>
      <Reveal>
        <SelfCheck />
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
        <About profile={profile} locale={locale} />
      </Reveal>
      <Reveal>
        <Contact settings={settings} />
      </Reveal>
    </>
  );
}
