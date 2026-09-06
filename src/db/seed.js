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
    contact_whatsapp: "918605015122", // digits only — wa.me needs country code
    consultation_hours: "By appointment · Online (worldwide) and clinic (Pune & Nagpur)",
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
      tagline: "Modern & classical homoeopathy",
      taglineHi: "आधुनिक एवं शास्त्रीय होम्योपैथी",
      bio: "Dr. Seema Prajapati (BHMS) is a homoeopathic physician with 20 years of clinical experience, blending modern and classical homoeopathy. Based in Maharashtra, she cares for patients across Pune and Nagpur and offers online consultations worldwide.\n\nShe specialises in women's health — including menstrual problems, uterine fibroids and ovarian cysts — alongside dedicated paediatric care. Over two decades she has developed homoeopathic protocols for chronic respiratory conditions such as asthma, skin diseases, and metabolic and lifestyle disorders including diabetes, obesity and hair loss.",
      bioHi:
        "डॉ. सीमा प्रजापति (BHMS) 20 वर्षों के नैदानिक अनुभव वाली होम्योपैथिक चिकित्सक हैं, जो आधुनिक एवं शास्त्रीय होम्योपैथी का समन्वय करती हैं। महाराष्ट्र में स्थित, वे पुणे और नागपुर में तथा विश्वभर में ऑनलाइन परामर्श प्रदान करती हैं।",
      badges: [{ label: "BHMS", label_hi: "" }],
      degrees: [
        { title: "BHMS", institution: "Bachelor of Homoeopathic Medicine & Surgery", year: "" },
      ],
      registrationNumber: "",
      registrationCouncil: "Maharashtra Council of Homoeopathy",
      memberships: [],
      yearsExperience: 20,
      stats: [
        { label: "Years Experience", label_hi: "वर्षों का अनुभव", value: "20+" },
        { label: "Severe Cases Treated", label_hi: "इलाज किए गए गंभीर मामले", value: "100+" },
        { label: "In-Clinic & Online Worldwide", label_hi: "क्लिनिक और ऑनलाइन विश्वभर", value: "Pune · Nagpur" },
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
      .values([
        {
          patientName: "Mangal Sarvade",
          text: "Dr. Seema Prajapati Mam has been our family doctor for more than 14 years now. My mother is a spine-injury and heart patient, so we visited Arya Clinic 14 years ago for her emergency treatment, and from the first day till date we have taken treatment from Dr. Seema Prajapati Mam. Thank you for your dedication and commitment to providing the best care — your compassion and expertise are truly inspiring. I can't thank you enough for the special, excellent care you have provided and for the unique gift you are to your patients. Thank you for taking such great care of my mother; your kindness and expertise made a difficult time much easier.",
          rating: 5,
          consentConfirmed: true,
          published: true,
          sortOrder: 1,
        },
        {
          patientName: "Sonali Sarvade",
          text: "I am incredibly happy with the services provided at Arya Clinic. Dr. Seema Prajapati Mam is professional and helpful. My father was diagnosed at a critical asthma stage, and throughout the treatment Dr. Seema Mam was remarkably supportive, keeping me at ease by being encouraging and reassuring. I highly recommend her expertise to anyone in need of specialized health care.",
          rating: 5,
          condition: "Asthma",
          consentConfirmed: true,
          published: true,
          sortOrder: 2,
        },
        {
          patientName: "Aruna Kotian",
          text: "I've had a wonderful experience with Dr. Seema. Unlike other consultations where I felt rushed, she took over an hour during my first visit to really understand my lifestyle and history. The remedies prescribed have been gentle and effective, and I appreciate how she explained the logic behind the treatment plan. Highly recommend for anyone looking for personalized care.",
          rating: 5,
          consentConfirmed: true,
          published: true,
          sortOrder: 3,
        },
      ])
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
 * like {patient_name} are filled by the notification adapter.
 *
 * {meet_link} appears ONLY in `reminder` — the message that actually tells
 * the patient to join. The confirmation goes out the moment payment lands,
 * and a Meet URL never expires, so putting the raw link there would hand out
 * a standing invitation days early; it carries {dashboard_link} instead, and
 * the dashboard reveals Join only inside the appointment's window. */
async function seedTemplates() {
  if (await hasRows(messageTemplates)) return;
  const T = [
    ["booking_received", "Slot held — complete your payment", "Hi {patient_name}, your {service} slot on {date} at {time} is held for 15 minutes. Please pay ₹{amount} securely in the payment window to confirm your booking. Track it on your dashboard: {dashboard_link}"],
    ["payment_received", "Payment received — confirming your appointment", "Thanks {patient_name}. Your payment of ₹{amount} for {date} {time} was received and your appointment is being confirmed automatically. Track it on your dashboard: {dashboard_link}"],
    ["confirmed", "Appointment confirmed", "Your appointment with {doctor_name} is confirmed for {date} at {time}. Manage your booking: {manage_link} Your personal dashboard (appointments, medicines, follow-ups — save this link): {dashboard_link}"],
    ["reminder", "Reminder: your appointment tomorrow", "Reminder: {patient_name}, your consultation with {doctor_name} is on {date} at {time}. {meet_link} Your dashboard: {dashboard_link}"],
    ["rescheduled", "Your appointment was rescheduled", "Hi {patient_name}, your appointment is now on {date} at {time}. Manage: {manage_link} Your dashboard: {dashboard_link}"],
    ["cancelled", "Your appointment was cancelled", "Hi {patient_name}, your appointment on {date} at {time} has been cancelled. Book again anytime from your dashboard: {dashboard_link}"],
    ["payment_refunded", "Payment refunded — please rebook", "Hi {patient_name}, the {date} {time} slot was taken before your payment completed, so we have refunded ₹{amount} to your original payment method (5–7 working days). Please rebook from your dashboard: {dashboard_link}"],
    ["follow_up", "Time for a follow-up?", "Hi {patient_name}, hope you're feeling better. Book a follow-up with {doctor_name} anytime from your dashboard: {dashboard_link}"],
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
