/**
 * Seed placeholder content so the site renders end-to-end before the
 * doctor enters her real details through the admin panel. Idempotent:
 * each seeder no-ops if its table already has rows, so re-running never
 * duplicates content (settings/admin also rely on PK/unique conflicts).
 *
 *   node --env-file=.env src/db/seed.js
 */
import bcrypt from "bcryptjs";
import { db } from "./index.js";
import {
  adminUsers,
  availabilityRules,
  caseGallery,
  conditions,
  faqs,
  messageTemplates,
  profile,
  researchItems,
  services,
  settings,
  testimonials,
} from "./schema.js";
import { SETTINGS_DEFAULTS } from "../lib/settings.js";
import { CONDITIONS_SEED } from "../lib/conditions-data.js";
import { sql } from "drizzle-orm";

/** True if the table already has ≥1 row — lets seeders no-op on re-run.
 * (onConflictDoNothing only helps tables with a unique/PK conflict target;
 * content tables have none, so a bare re-run would duplicate everything.) */
async function hasRows(table) {
  const res = await db.execute(sql`select 1 from ${table} limit 1`);
  return (res.rows?.length ?? 0) > 0;
}

async function seedSettings() {
  // Real client values override the generic defaults for known keys.
  const REAL = {
    payee_name: "Dr. Seema Prajapati",
    upi_id: "seema.kanoje18-1@oksbi",
    upi_number: "8999758063",
    contact_phone: "+91 89997 58063",
    contact_whatsapp: "918999758063", // digits only — wa.me needs country code
    consultation_hours: "By appointment · Online (worldwide) and clinic (Nagpur & Pune)",
  };
  const merged = { ...SETTINGS_DEFAULTS, ...REAL };
  for (const [key, value] of Object.entries(merged)) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing();
  }
}

async function seedProfile() {
  if (await hasRows(profile)) return;
  await db
    .insert(profile)
    .values({
      name: "Dr. Seema Prajapati",
      tagline: "Modern & classical homoeopathy — healing starts here",
      taglineHi: "आधुनिक एवं शास्त्रीय होम्योपैथी — यहीं से आरोग्य आरंभ",
      bio: "Dr. Seema Prajapati (BHMS) is a homoeopathic physician with 20 years of clinical experience, blending modern and classical homoeopathy. Based in Maharashtra, she cares for patients across Nagpur and Pune and offers online consultations worldwide.\n\nShe specialises in women's health — including menstrual problems, uterine fibroids and ovarian cysts — alongside dedicated paediatric care. Over two decades she has developed homoeopathic protocols for chronic respiratory conditions such as asthma, skin diseases, and metabolic and lifestyle disorders including diabetes, obesity and hair loss.",
      bioHi:
        "डॉ. सीमा प्रजापति (BHMS) 20 वर्षों के नैदानिक अनुभव वाली होम्योपैथिक चिकित्सक हैं, जो आधुनिक एवं शास्त्रीय होम्योपैथी का समन्वय करती हैं। महाराष्ट्र में स्थित, वे नागपुर और पुणे में तथा विश्वभर में ऑनलाइन परामर्श प्रदान करती हैं।",
      degrees: [
        { title: "BHMS", institution: "Bachelor of Homoeopathic Medicine & Surgery", year: "" },
      ],
      registrationNumber: "",
      registrationCouncil: "Maharashtra Council of Homoeopathy",
      memberships: [],
      yearsExperience: 20,
      stats: [
        { label: "Years Experience", label_hi: "वर्षों का अनुभव", value: "20+" },
        { label: "Cities Served", label_hi: "सेवित शहर", value: "Nagpur · Pune" },
        { label: "Online", label_hi: "ऑनलाइन", value: "Worldwide" },
      ],
      heroImage: "/brand/dr-seema.jpeg",
      aboutImage: "/brand/dr-seema.jpeg",
      socialLinks: [],
    })
    .onConflictDoNothing();
}

async function seedServices() {
  if (await hasRows(services)) return;
  // NOTE: fees/durations below are placeholders — the doctor sets real
  // values in Admin ▸ Content ▸ Services before launch.
  const list = [
    {
      title: "First Consultation (Online)",
      titleHi: "पहला परामर्श (ऑनलाइन)",
      description:
        "Detailed case-taking video consultation for any new complaint — women's health, paediatric, respiratory, skin or lifestyle conditions.",
      durationMinutes: 30,
      feeInr: 500,
      mode: "online",
      sortOrder: 1,
    },
    {
      title: "Follow-up Consultation (Online)",
      titleHi: "फ़ॉलो-अप परामर्श (ऑनलाइन)",
      description: "Review visit for an ongoing course of treatment.",
      durationMinutes: 15,
      feeInr: 300,
      mode: "online",
      isFollowUp: true,
      sortOrder: 2,
    },
    {
      title: "Women's Health Consultation",
      titleHi: "महिला स्वास्थ्य परामर्श",
      description:
        "Focused care for menstrual problems, uterine fibroids, ovarian cysts and related conditions.",
      durationMinutes: 30,
      feeInr: 500,
      mode: "online",
      sortOrder: 3,
    },
    {
      title: "Paediatric Consultation",
      titleHi: "बाल रोग परामर्श",
      description:
        "Gentle homoeopathic care for children — immunity, recurrent infections, allergies and growth concerns.",
      durationMinutes: 30,
      feeInr: 500,
      mode: "online",
      sortOrder: 4,
    },
  ];
  for (const s of list) await db.insert(services).values(s).onConflictDoNothing();
}

async function seedAvailability() {
  if (await hasRows(availabilityRules)) return;
  // Mon–Sat, 10:00–13:00 IST, 30-min online slots. Placeholder schedule.
  for (let weekday = 1; weekday <= 6; weekday++) {
    await db
      .insert(availabilityRules)
      .values({
        weekday,
        startTime: "10:00:00",
        endTime: "13:00:00",
        slotLengthMinutes: 30,
        mode: "online",
      })
      .onConflictDoNothing();
  }
}

async function seedFaqs() {
  if (await hasRows(faqs)) return;
  const items = [
    ["About homoeopathy", "What is homoeopathy and how does it work?", "Homoeopathy treats the whole person with highly individualised remedies chosen to match your symptom picture, aiming to stimulate the body's own healing response."],
    ["About homoeopathy", "Is homoeopathy safe? Are there side effects?", "Remedies are prepared in minute doses and are generally very gentle. Always tell the doctor about any existing medicines you take."],
    ["About homoeopathy", "What is 'homoeopathic aggravation'?", "Occasionally symptoms briefly intensify before improving — a well-known, usually short-lived response your doctor will guide you through."],
    ["About homoeopathy", "How long until I see improvement?", "Acute complaints often respond within a few doses; chronic conditions are treated over weeks with regular follow-ups."],
    ["Consultations", "What happens in the first consultation?", "Expect detailed questions about your symptoms, history, temperament and lifestyle — classical case-taking so treatment fits you specifically."],
    ["Consultations", "Can I take remedies alongside my existing medicines?", "Usually yes, but never stop prescribed medication without advice. Share your full medication list during the consultation."],
    ["Consultations", "How do online consultations work?", "After booking and payment you receive a video-call link; consultations by video, audio or text are permitted under telemedicine guidelines."],
    ["Booking & payment", "How do I pay, and what if my payment hold expires?", "Pay by UPI during the 15-minute hold and enter your transaction reference. If the hold lapses after you've paid, submit the reference anyway and the doctor will restore or reschedule your slot."],
    ["Booking & payment", "Can I reschedule or cancel?", "Yes — every confirmation includes a secure link to reschedule or cancel without needing an account."],
  ];
  let order = 0;
  for (const [category, question, answer] of items) {
    await db
      .insert(faqs)
      .values({ category, question, answer, sortOrder: order++ })
      .onConflictDoNothing();
  }
}

async function seedConditions() {
  if (await hasRows(conditions)) return;
  for (const c of CONDITIONS_SEED) {
    await db.insert(conditions).values(c).onConflictDoNothing();
  }
}

async function seedPlaceholderShowcase() {
  if (!(await hasRows(testimonials)))
    await db
      .insert(testimonials)
    .values({
      patientName: "R. S.",
      text: "Placeholder testimonial — replace via admin. Compassionate care and real improvement.",
      rating: 5,
      consentConfirmed: false,
      published: false,
      sortOrder: 0,
    })
    .onConflictDoNothing();

  if (!(await hasRows(caseGallery)))
    await db
      .insert(caseGallery)
      .values({
        condition: "Placeholder case",
        description: "Replace via admin. Requires signed consent before publishing.",
        treatmentDuration: "3 months",
        consentConfirmed: false,
        published: false,
        sortOrder: 0,
      })
      .onConflictDoNothing();

  if (!(await hasRows(researchItems)))
    await db
      .insert(researchItems)
      .values({
        title: "Placeholder research item",
        summary: "Hidden until the research section is published in Settings.",
        type: "article",
        linkOrFile: "#",
        visible: true,
        sortOrder: 0,
      })
      .onConflictDoNothing();
}

/** Seven booking-event templates × two channels (email + sms). Placeholders
 * like {patient_name} are filled by the notification adapter (Fable §5). */
async function seedTemplates() {
  if (await hasRows(messageTemplates)) return;
  const T = [
    ["booking_received", "Slot held — complete your payment", "Hi {patient_name}, your {service} slot on {date} at {time} is held for 15 minutes. Please pay ₹{amount} via UPI ({upi_id}) and enter your transaction reference to confirm."],
    ["payment_received", "Payment received — pending verification", "Thanks {patient_name}. We've received your payment reference for {date} {time}. The doctor will verify and confirm shortly."],
    ["confirmed", "Appointment confirmed", "Your appointment with {doctor_name} is confirmed for {date} at {time}. {meet_link} Manage your booking: {manage_link}"],
    ["reminder", "Reminder: your appointment tomorrow", "Reminder: {patient_name}, your consultation with {doctor_name} is on {date} at {time}. {meet_link}"],
    ["rescheduled", "Your appointment was rescheduled", "Hi {patient_name}, your appointment is now on {date} at {time}. Manage: {manage_link}"],
    ["cancelled", "Your appointment was cancelled", "Hi {patient_name}, your appointment on {date} at {time} has been cancelled. Reply to rebook."],
    ["follow_up", "Time for a follow-up?", "Hi {patient_name}, hope you're feeling better. Book a follow-up with {doctor_name} whenever you're ready."],
  ];
  for (const [event, subject, body] of T) {
    await db
      .insert(messageTemplates)
      .values({ event, channel: "email", subject, body })
      .onConflictDoNothing();
    await db
      .insert(messageTemplates)
      .values({ event, channel: "sms", subject: null, body })
      .onConflictDoNothing();
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("! ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed.");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .insert(adminUsers)
    .values({ email, passwordHash })
    .onConflictDoNothing();
}

async function main() {
  await seedSettings();
  await seedProfile();
  await seedServices();
  await seedAvailability();
  await seedFaqs();
  await seedConditions();
  await seedPlaceholderShowcase();
  await seedTemplates();
  await seedAdmin();
  console.log("✓ Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
