/**
 * Self-assessment quiz definitions. Structured as data (like
 * src/lib/conditions-data.js) so a second quiz is cheap to add later — but
 * only one quiz exists today. Bilingual fields follow the site's
 * text/textHi convention; localizeQuiz() collapses them to plain strings
 * for the locale before the definition reaches the client component.
 *
 * The copy is deliberately claims-neutral and NON-diagnostic (Drugs & Magic
 * Remedies Act / ASCI): a self-check that may suggest talking to a doctor —
 * never a diagnosis or a promise of cure. Scoring is a simple severity sum.
 */

const WOMENS_HEALTH_QUIZ = {
  slug: "womens-health",
  name: "Women's Health Self-Check",
  nameHi: "महिला स्वास्थ्य स्व-जाँच",
  // Each option carries a 0–3 severity score; the sum is mapped to a band.
  questions: [
    {
      id: "cycle",
      text: "How regular are your menstrual cycles?",
      textHi: "आपका मासिक चक्र कितना नियमित है?",
      options: [
        { text: "Regular and predictable", textHi: "नियमित और अनुमानित", score: 0 },
        { text: "Slightly irregular now and then", textHi: "कभी-कभी थोड़ा अनियमित", score: 1 },
        { text: "Often irregular or unpredictable", textHi: "अक्सर अनियमित या अनिश्चित", score: 2 },
        { text: "Very irregular, or I skip periods for months", textHi: "बहुत अनियमित, या कई महीनों तक मासिक धर्म नहीं आता", score: 3 },
      ],
    },
    {
      id: "flow",
      text: "How would you describe your menstrual bleeding?",
      textHi: "आप अपने मासिक रक्तस्राव का वर्णन कैसे करेंगी?",
      options: [
        { text: "Normal", textHi: "सामान्य", score: 0 },
        { text: "Occasionally heavy or with small clots", textHi: "कभी-कभी भारी या छोटे थक्कों के साथ", score: 1 },
        { text: "Often heavy or prolonged", textHi: "अक्सर भारी या लंबे समय तक", score: 2 },
        { text: "Very heavy or prolonged, affects daily life", textHi: "बहुत भारी या लंबा, दैनिक जीवन को प्रभावित करता है", score: 3 },
      ],
    },
    {
      id: "pain",
      text: "Do you get period pain or cramps?",
      textHi: "क्या आपको मासिक धर्म में दर्द या ऐंठन होती है?",
      options: [
        { text: "Little or none", textHi: "बहुत कम या नहीं", score: 0 },
        { text: "Mild and manageable", textHi: "हल्का और सहनीय", score: 1 },
        { text: "Moderate — sometimes need rest or medicine", textHi: "मध्यम — कभी-कभी आराम या दवा की ज़रूरत", score: 2 },
        { text: "Severe — disrupts work or daily activities", textHi: "गंभीर — काम या दैनिक गतिविधियों में बाधा", score: 3 },
      ],
    },
    {
      id: "skin",
      text: "Do you notice acne, oily skin, or unwanted facial or body hair?",
      textHi: "क्या आप मुँहासे, तैलीय त्वचा, या चेहरे/शरीर पर अनचाहे बाल देखती हैं?",
      options: [
        { text: "No", textHi: "नहीं", score: 0 },
        { text: "Occasionally or mild", textHi: "कभी-कभी या हल्का", score: 1 },
        { text: "Frequently", textHi: "अक्सर", score: 2 },
        { text: "Persistent and troubling", textHi: "लगातार और परेशान करने वाला", score: 3 },
      ],
    },
    {
      id: "weight",
      text: "Have you had unexplained weight gain or difficulty losing weight?",
      textHi: "क्या आपका वज़न बिना कारण बढ़ा है या कम करने में कठिनाई होती है?",
      options: [
        { text: "No", textHi: "नहीं", score: 0 },
        { text: "Slight", textHi: "थोड़ा", score: 1 },
        { text: "Noticeable", textHi: "ध्यान देने योग्य", score: 2 },
        { text: "Significant and hard to manage", textHi: "काफ़ी अधिक और संभालना कठिन", score: 3 },
      ],
    },
    {
      id: "mood",
      text: "How often do mood swings, low energy or irritability affect you around your cycle?",
      textHi: "मासिक चक्र के आसपास मनोदशा में उतार-चढ़ाव, कम ऊर्जा या चिड़चिड़ापन आपको कितनी बार प्रभावित करते हैं?",
      options: [
        { text: "Rarely", textHi: "शायद ही कभी", score: 0 },
        { text: "Sometimes", textHi: "कभी-कभी", score: 1 },
        { text: "Often", textHi: "अक्सर", score: 2 },
        { text: "Most days", textHi: "अधिकांश दिन", score: 3 },
      ],
    },
    {
      id: "pelvic",
      text: "Do you feel pelvic pressure, bloating or lower-abdominal discomfort between periods?",
      textHi: "क्या आपको मासिक धर्म के बीच पेल्विक दबाव, पेट फूलना या निचले पेट में असुविधा महसूस होती है?",
      options: [
        { text: "No", textHi: "नहीं", score: 0 },
        { text: "Occasionally", textHi: "कभी-कभी", score: 1 },
        { text: "Often", textHi: "अक्सर", score: 2 },
        { text: "Frequently, often with pain", textHi: "बार-बार, अक्सर दर्द के साथ", score: 3 },
      ],
    },
    {
      id: "impact",
      text: "How long have these concerns been present, and do they affect your daily life?",
      textHi: "ये समस्याएँ कब से हैं, और क्या वे आपके दैनिक जीवन को प्रभावित करती हैं?",
      options: [
        { text: "Not really an issue", textHi: "कोई खास समस्या नहीं", score: 0 },
        { text: "Recently, with mild impact", textHi: "हाल ही में, हल्के प्रभाव के साथ", score: 1 },
        { text: "For several months, moderate impact", textHi: "कई महीनों से, मध्यम प्रभाव", score: 2 },
        { text: "A year or more, significant impact", textHi: "एक वर्ष या अधिक से, काफ़ी प्रभाव", score: 3 },
      ],
    },
    {
      id: "history",
      text: "Have you been told you may have — or have a family history of — PCOS, fibroids, ovarian cysts or thyroid problems?",
      textHi: "क्या आपको बताया गया है कि आपको PCOS, फाइब्रॉइड, ओवेरियन सिस्ट या थायरॉइड की समस्या हो सकती है — या इनका पारिवारिक इतिहास है?",
      options: [
        { text: "No", textHi: "नहीं", score: 0 },
        { text: "Not sure", textHi: "पता नहीं", score: 1 },
        { text: "Family history only", textHi: "केवल पारिवारिक इतिहास", score: 2 },
        { text: "Yes, diagnosed", textHi: "हाँ, निदान हुआ है", score: 3 },
      ],
    },
  ],
  // Ordered low → high; resultKey is the highest band whose min ≤ score.
  bands: [
    { key: "low", min: 0 },
    { key: "moderate", min: 9 },
    { key: "significant", min: 18 },
  ],
  results: {
    low: {
      title: "Your answers suggest little to be concerned about right now",
      titleHi: "आपके उत्तर बताते हैं कि अभी चिंता की ज़्यादा बात नहीं है",
      body: "Based on what you shared, your menstrual and hormonal health seems steady at the moment. Keep up healthy routines, and see a doctor if anything changes. This is a general self-check, not a diagnosis.",
      bodyHi: "आपने जो साझा किया, उसके आधार पर इस समय आपका मासिक एवं हार्मोनल स्वास्थ्य स्थिर लगता है। स्वस्थ दिनचर्या बनाए रखें, और कुछ भी बदलने पर चिकित्सक से मिलें। यह एक सामान्य स्व-जाँच है, निदान नहीं।",
    },
    moderate: {
      title: "A few symptoms worth keeping an eye on",
      titleHi: "कुछ लक्षण जिन पर ध्यान देना उचित होगा",
      body: "Your answers point to some menstrual or hormonal symptoms that are common and often manageable. It may be worth discussing them with a doctor, especially if they affect your daily life. This self-check is not a diagnosis.",
      bodyHi: "आपके उत्तर कुछ ऐसे मासिक या हार्मोनल लक्षणों की ओर संकेत करते हैं जो सामान्य हैं और अक्सर संभाले जा सकते हैं। इन पर किसी चिकित्सक से चर्चा करना उचित हो सकता है, विशेषकर यदि ये आपके दैनिक जीवन को प्रभावित करते हों। यह स्व-जाँच कोई निदान नहीं है।",
    },
    significant: {
      title: "It may be worth discussing your symptoms with a doctor",
      titleHi: "अपने लक्षणों पर किसी चिकित्सक से चर्चा करना उचित हो सकता है",
      body: "Your answers suggest several symptoms that are worth talking through with a qualified doctor, who can guide you on any tests or care you may need. This self-check cannot diagnose any condition — please consider booking a consultation or seeing your gynaecologist.",
      bodyHi: "आपके उत्तर कई ऐसे लक्षणों का संकेत देते हैं जिन पर किसी योग्य चिकित्सक से बात करना उचित है, जो आपको आवश्यक जाँच या देखभाल के बारे में मार्गदर्शन दे सकती हैं। यह स्व-जाँच किसी स्थिति का निदान नहीं कर सकती — कृपया परामर्श बुक करने या अपनी स्त्री रोग विशेषज्ञ से मिलने पर विचार करें।",
    },
  },
};

const QUIZZES = [WOMENS_HEALTH_QUIZ];

/** One quiz definition by slug, or null (page calls notFound()). */
export function getQuiz(slug) {
  return QUIZZES.find((q) => q.slug === slug) ?? null;
}

/** Slugs for generateStaticParams / sitemap. */
export function quizSlugs() {
  return QUIZZES.map((q) => q.slug);
}

/**
 * Collapse a quiz's bilingual fields to plain strings for the locale so the
 * client component never sees the *Hi variants. Option scores and band
 * thresholds are locale-independent and pass through unchanged.
 */
export function localizeQuiz(quiz, locale) {
  const pick = (o, f) => (locale === "hi" && o[`${f}Hi`]) || o[f];
  const results = {};
  for (const key of Object.keys(quiz.results)) {
    const r = quiz.results[key];
    results[key] = { title: pick(r, "title"), body: pick(r, "body") };
  }
  return {
    slug: quiz.slug,
    name: pick(quiz, "name"),
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: pick(q, "text"),
      options: q.options.map((o) => ({ text: pick(o, "text"), score: o.score })),
    })),
    bands: quiz.bands,
    results,
  };
}

/** Maximum achievable score for a quiz (sum of each question's top option). */
export function maxScore(quiz) {
  return quiz.questions.reduce(
    (sum, q) => sum + Math.max(...q.options.map((o) => o.score)),
    0,
  );
}

/**
 * Score an array of selected option indices (one per question). Returns the
 * total, the maximum, and the band key. The server recomputes this from the
 * raw answers so the stored result never trusts a client-sent score.
 */
export function scoreQuiz(quiz, answers) {
  let score = 0;
  quiz.questions.forEach((q, i) => {
    const opt = q.options[answers[i]];
    if (opt) score += opt.score;
  });
  const resultKey = [...quiz.bands]
    .reverse()
    .find((b) => score >= b.min)?.key ?? quiz.bands[0].key;
  return { score, maxScore: maxScore(quiz), resultKey };
}
