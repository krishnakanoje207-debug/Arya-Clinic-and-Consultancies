/**
 * Canonical seed content for the six conditions Dr. Seema treats. Shared by
 * the seeder (src/db/seed.js) and the code-level fallback (DEFAULT_CONDITIONS
 * in src/lib/content.js) so both stay in sync and the site renders every
 * condition page even before the DB is provisioned.
 *
 * Copy is educational and claims-neutral by design — no cure guarantees or
 * success percentages (Drugs & Magic Remedies Act / ASCI). Framed as
 * homoeopathic "management" and "support" alongside conventional care. The
 * doctor of record reviews/edits this text in the admin panel before launch.
 *
 * jsonb shapes: symptoms/causes = [{ text, text_hi }]; faqs =
 * [{ q, q_hi, a, a_hi }]; references = [{ title, url }].
 */
export const CONDITIONS_SEED = [
  {
    slug: "pcos",
    name: "Polycystic Ovary Syndrome (PCOS)",
    nameHi: "पॉलीसिस्टिक ओवरी सिंड्रोम (PCOS)",
    intro:
      "PCOS is a common hormonal condition affecting how the ovaries work — often behind irregular periods, weight changes and skin or hair concerns in women of reproductive age.",
    introHi:
      "PCOS एक सामान्य हार्मोनल स्थिति है जो अंडाशय के कार्य को प्रभावित करती है — प्रजनन आयु की महिलाओं में अनियमित मासिक धर्म, वज़न में बदलाव और त्वचा या बालों की समस्याओं का यह अक्सर कारण होता है।",
    overview:
      "Polycystic Ovary Syndrome is a hormonal and metabolic condition in which the ovaries may develop many small follicles and release eggs irregularly. It is one of the most common causes of irregular cycles and is often linked with insulin resistance.\n\nHomoeopathic management looks at the whole person — cycle pattern, weight, stress, sleep and family history — and works to support hormonal balance individually, alongside the dietary and lifestyle measures that are central to living well with PCOS.",
    overviewHi:
      "पॉलीसिस्टिक ओवरी सिंड्रोम एक हार्मोनल एवं चयापचय संबंधी स्थिति है जिसमें अंडाशय में कई छोटे फॉलिकल बन सकते हैं और अंडोत्सर्ग अनियमित हो जाता है। यह अनियमित मासिक चक्र के सबसे सामान्य कारणों में से एक है और अक्सर इंसुलिन प्रतिरोध से जुड़ी होती है।\n\nहोम्योपैथिक देखभाल पूरे व्यक्ति को देखती है — मासिक चक्र, वज़न, तनाव, नींद और पारिवारिक इतिहास — और आहार व जीवनशैली उपायों के साथ हार्मोनल संतुलन को व्यक्तिगत रूप से सहारा देने का प्रयास करती है।",
    symptoms: [
      { text: "Irregular, infrequent or prolonged periods", text_hi: "अनियमित, कम या लंबे समय तक चलने वाला मासिक धर्म" },
      { text: "Weight gain or difficulty losing weight", text_hi: "वज़न बढ़ना या वज़न कम करने में कठिनाई" },
      { text: "Excess facial or body hair", text_hi: "चेहरे या शरीर पर अत्यधिक बाल" },
      { text: "Acne or oily skin", text_hi: "मुँहासे या तैलीय त्वचा" },
      { text: "Thinning of scalp hair", text_hi: "सिर के बालों का पतला होना" },
      { text: "Difficulty conceiving", text_hi: "गर्भधारण में कठिनाई" },
    ],
    causes: [
      { text: "Hormonal imbalance with higher androgen levels", text_hi: "अधिक एंड्रोजन स्तर के साथ हार्मोनल असंतुलन" },
      { text: "Insulin resistance", text_hi: "इंसुलिन प्रतिरोध" },
      { text: "Family history of PCOS or diabetes", text_hi: "PCOS या मधुमेह का पारिवारिक इतिहास" },
      { text: "Sedentary lifestyle and weight gain", text_hi: "गतिहीन जीवनशैली और वज़न बढ़ना" },
      { text: "Chronic stress", text_hi: "दीर्घकालिक तनाव" },
    ],
    approach:
      "Homoeopathy approaches PCOS constitutionally — the remedy is individualised to your cycle, temperament, metabolism and stress pattern rather than to a diagnosis alone. The aim is to gently support the body's own hormonal regulation while you also work on nutrition, movement and sleep. Treatment is planned over regular follow-ups and is meant to complement, not replace, your gynaecologist's advice and any investigations she recommends.",
    approachHi:
      "होम्योपैथी PCOS को संवैधानिक रूप से देखती है — औषधि केवल निदान के बजाय आपके मासिक चक्र, स्वभाव, चयापचय और तनाव के अनुसार व्यक्तिगत रूप से चुनी जाती है। उद्देश्य है शरीर के अपने हार्मोनल नियमन को धीरे-धीरे सहारा देना, साथ ही पोषण, व्यायाम और नींद पर काम करना। उपचार नियमित फ़ॉलो-अप के साथ किया जाता है और यह आपकी स्त्री रोग विशेषज्ञ की सलाह का पूरक है, विकल्प नहीं।",
    faqs: [
      {
        q: "Can homoeopathy help with PCOS?",
        q_hi: "क्या होम्योपैथी PCOS में मदद कर सकती है?",
        a: "Homoeopathy offers individualised support aimed at your symptom picture and overall balance, alongside diet and lifestyle changes. It works best as part of a broader plan with your gynaecologist.",
        a_hi: "होम्योपैथी आपके लक्षण-चित्र और समग्र संतुलन के अनुसार व्यक्तिगत सहायता प्रदान करती है, साथ ही आहार और जीवनशैली में बदलाव के साथ। यह आपकी स्त्री रोग विशेषज्ञ के साथ व्यापक योजना के हिस्से के रूप में सबसे अच्छा काम करती है।",
      },
      {
        q: "Do I need to continue my other medicines?",
        q_hi: "क्या मुझे अपनी अन्य दवाइयाँ जारी रखनी चाहिए?",
        a: "Never stop prescribed medication without your doctor's advice. Please share your full medication list during the consultation so care can be coordinated safely.",
        a_hi: "अपने चिकित्सक की सलाह के बिना निर्धारित दवा कभी बंद न करें। कृपया परामर्श के दौरान अपनी सभी दवाइयों की सूची साझा करें ताकि देखभाल सुरक्षित रूप से समन्वित हो सके।",
      },
      {
        q: "How long does treatment take?",
        q_hi: "उपचार में कितना समय लगता है?",
        a: "PCOS is a chronic condition managed over months with regular reviews. Your response is tracked at each follow-up and the plan is adjusted as you improve.",
        a_hi: "PCOS एक दीर्घकालिक स्थिति है जिसे नियमित समीक्षाओं के साथ कई महीनों में प्रबंधित किया जाता है। हर फ़ॉलो-अप पर आपकी प्रतिक्रिया देखी जाती है और सुधार के साथ योजना समायोजित की जाती है।",
      },
    ],
    references: [
      { title: "WHO — Polycystic ovary syndrome", url: "https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome" },
      { title: "NHS — Polycystic ovary syndrome (PCOS)", url: "https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/" },
    ],
    cardImage: "/photos/womens-health.jpg",
    sortOrder: 1,
    published: true,
  },
  {
    slug: "uterine-fibroids",
    name: "Uterine Fibroids",
    nameHi: "गर्भाशय फाइब्रॉइड",
    intro:
      "Fibroids are common non-cancerous growths in or around the uterus. Many cause no trouble, but some lead to heavy periods, pelvic pressure or discomfort.",
    introHi:
      "फाइब्रॉइड गर्भाशय में या उसके आसपास बनने वाली सामान्य गैर-कैंसरयुक्त गाँठें हैं। कई बार ये कोई परेशानी नहीं करतीं, पर कुछ भारी मासिक धर्म, पेल्विक दबाव या असुविधा का कारण बनती हैं।",
    overview:
      "Uterine fibroids (myomas) are benign muscular growths of the womb that are very common during the reproductive years and often shrink after menopause. Their size and position determine whether they cause symptoms.\n\nHomoeopathic care focuses on the individual — the pattern of bleeding, pain and general constitution — to support comfort and wellbeing. Because fibroids need proper gynaecological assessment (ultrasound and periodic monitoring), homoeopathy is offered as supportive care alongside that evaluation, not as a substitute for it.",
    overviewHi:
      "गर्भाशय फाइब्रॉइड (मायोमा) गर्भाशय की सौम्य मांसपेशीय गाँठें हैं जो प्रजनन वर्षों में बहुत आम हैं और अक्सर रजोनिवृत्ति के बाद सिकुड़ जाती हैं। इनका आकार और स्थान तय करते हैं कि लक्षण होंगे या नहीं।\n\nहोम्योपैथिक देखभाल व्यक्ति पर केंद्रित होती है — रक्तस्राव, दर्द और सामान्य प्रकृति का स्वरूप — ताकि आराम और स्वास्थ्य को सहारा मिले। चूँकि फाइब्रॉइड के लिए उचित स्त्री रोग मूल्यांकन (अल्ट्रासाउंड और समय-समय पर निगरानी) आवश्यक है, होम्योपैथी उस मूल्यांकन के साथ सहायक देखभाल के रूप में दी जाती है, उसके विकल्प के रूप में नहीं।",
    symptoms: [
      { text: "Heavy or prolonged menstrual bleeding", text_hi: "भारी या लंबे समय तक मासिक रक्तस्राव" },
      { text: "Pelvic pressure or fullness", text_hi: "पेल्विक क्षेत्र में दबाव या भारीपन" },
      { text: "Frequent urge to urinate", text_hi: "बार-बार पेशाब की इच्छा" },
      { text: "Lower back or pelvic discomfort", text_hi: "कमर या पेल्विक क्षेत्र में असुविधा" },
      { text: "Fatigue from blood loss (anaemia)", text_hi: "रक्त की कमी से थकान (एनीमिया)" },
    ],
    causes: [
      { text: "Hormonal influence of oestrogen and progesterone", text_hi: "एस्ट्रोजन और प्रोजेस्टेरोन का हार्मोनल प्रभाव" },
      { text: "Family history of fibroids", text_hi: "फाइब्रॉइड का पारिवारिक इतिहास" },
      { text: "Early onset of periods", text_hi: "मासिक धर्म का जल्दी आरंभ" },
      { text: "Obesity and metabolic factors", text_hi: "मोटापा और चयापचय संबंधी कारक" },
    ],
    approach:
      "Homoeopathy treats the woman, not just the scan — the remedy is chosen from the whole picture of bleeding, pain, energy and constitution to support comfort and quality of life. Regular ultrasound monitoring with your gynaecologist remains essential, and any rapid growth, severe pain or very heavy bleeding needs prompt medical review. Homoeopathic support is planned to work alongside that care.",
    approachHi:
      "होम्योपैथी केवल स्कैन का नहीं, बल्कि महिला का उपचार करती है — औषधि रक्तस्राव, दर्द, ऊर्जा और प्रकृति के समग्र चित्र से चुनी जाती है ताकि आराम और जीवन-गुणवत्ता को सहारा मिले। आपकी स्त्री रोग विशेषज्ञ के साथ नियमित अल्ट्रासाउंड निगरानी आवश्यक बनी रहती है, और तेज़ी से बढ़ना, गंभीर दर्द या बहुत भारी रक्तस्राव होने पर तुरंत चिकित्सा जाँच ज़रूरी है। होम्योपैथिक सहायता उस देखभाल के साथ मिलकर काम करने के लिए बनाई जाती है।",
    faqs: [
      {
        q: "Will homoeopathy dissolve my fibroid?",
        q_hi: "क्या होम्योपैथी मेरे फाइब्रॉइड को घोल देगी?",
        a: "We do not make such promises. Homoeopathy aims to support your symptoms and wellbeing; the fibroid itself must be monitored on ultrasound with your gynaecologist, who advises on any further treatment.",
        a_hi: "हम ऐसे वादे नहीं करते। होम्योपैथी आपके लक्षणों और स्वास्थ्य को सहारा देने का प्रयास करती है; फाइब्रॉइड की निगरानी आपकी स्त्री रोग विशेषज्ञ के साथ अल्ट्रासाउंड पर होनी चाहिए, जो आगे के उपचार पर सलाह देती हैं।",
      },
      {
        q: "When should I see a doctor urgently?",
        q_hi: "मुझे तुरंत चिकित्सक से कब मिलना चाहिए?",
        a: "Very heavy bleeding, severe pelvic pain, fainting or rapidly increasing size need prompt medical attention. Homoeopathy is supportive care, not emergency care.",
        a_hi: "बहुत भारी रक्तस्राव, गंभीर पेल्विक दर्द, बेहोशी या तेज़ी से बढ़ता आकार होने पर तुरंत चिकित्सा सहायता आवश्यक है। होम्योपैथी सहायक देखभाल है, आपातकालीन देखभाल नहीं।",
      },
      {
        q: "Can I take it with my prescribed medicines?",
        q_hi: "क्या मैं इसे अपनी निर्धारित दवाओं के साथ ले सकती हूँ?",
        a: "Usually yes, but do share your full medication list so treatment can be coordinated safely, and never stop prescribed medicines without advice.",
        a_hi: "आमतौर पर हाँ, पर अपनी सभी दवाइयों की सूची साझा करें ताकि उपचार सुरक्षित रूप से समन्वित हो, और सलाह के बिना निर्धारित दवाएँ कभी बंद न करें।",
      },
    ],
    references: [
      { title: "NHS — Fibroids", url: "https://www.nhs.uk/conditions/fibroids/" },
      { title: "MedlinePlus — Uterine Fibroids", url: "https://medlineplus.gov/uterinefibroids.html" },
    ],
    cardImage: "/photos/uterine-fibroids.jpg",
    sortOrder: 2,
    published: true,
  },
  {
    slug: "asthma",
    name: "Asthma & Allergic Respiratory Disorders",
    nameHi: "दमा एवं एलर्जिक श्वसन विकार",
    intro:
      "Asthma and allergic airway conditions cause recurrent cough, wheeze and breathlessness. With the right long-term care, most people breathe and live comfortably.",
    introHi:
      "दमा और एलर्जिक श्वसन स्थितियाँ बार-बार खाँसी, घरघराहट और साँस फूलने का कारण बनती हैं। सही दीर्घकालिक देखभाल के साथ अधिकांश लोग आराम से साँस लेते और जीते हैं।",
    overview:
      "Asthma is a long-term condition in which the airways become sensitive and inflamed, narrowing in response to triggers such as dust, pollen, cold air or infection. Allergic rhinitis and recurrent respiratory allergies often go hand in hand with it.\n\nHomoeopathy looks at each person's individual trigger pattern, constitution and history of allergy to offer supportive care aimed at reducing the frequency and intensity of episodes. It is offered alongside — never instead of — prescribed inhalers and an asthma action plan, which remain essential for control and for emergencies.",
    overviewHi:
      "दमा एक दीर्घकालिक स्थिति है जिसमें श्वसन मार्ग संवेदनशील और सूजनयुक्त हो जाते हैं, और धूल, पराग, ठंडी हवा या संक्रमण जैसे उत्प्रेरकों पर सिकुड़ जाते हैं। एलर्जिक राइनाइटिस और बार-बार होने वाली श्वसन एलर्जी अक्सर इसके साथ चलती हैं।\n\nहोम्योपैथी प्रत्येक व्यक्ति के उत्प्रेरक स्वरूप, प्रकृति और एलर्जी के इतिहास को देखकर सहायक देखभाल प्रदान करती है जिसका उद्देश्य दौरों की आवृत्ति और तीव्रता कम करना है। यह निर्धारित इन्हेलर और अस्थमा एक्शन प्लान के साथ दी जाती है — उसके स्थान पर कभी नहीं — जो नियंत्रण और आपात स्थितियों के लिए आवश्यक बने रहते हैं।",
    symptoms: [
      { text: "Recurrent cough, often worse at night", text_hi: "बार-बार खाँसी, अक्सर रात में अधिक" },
      { text: "Wheezing or a whistling sound while breathing", text_hi: "घरघराहट या साँस लेते समय सीटी जैसी आवाज़" },
      { text: "Shortness of breath", text_hi: "साँस फूलना" },
      { text: "Tightness or discomfort in the chest", text_hi: "छाती में जकड़न या असुविधा" },
      { text: "Symptoms triggered by dust, pollen or cold air", text_hi: "धूल, पराग या ठंडी हवा से लक्षण बढ़ना" },
    ],
    causes: [
      { text: "Allergic sensitivity to dust, pollen or pets", text_hi: "धूल, पराग या पालतू जानवरों के प्रति एलर्जिक संवेदनशीलता" },
      { text: "Family history of asthma or allergy", text_hi: "दमा या एलर्जी का पारिवारिक इतिहास" },
      { text: "Respiratory infections", text_hi: "श्वसन संक्रमण" },
      { text: "Air pollution and smoke", text_hi: "वायु प्रदूषण और धुआँ" },
      { text: "Cold weather or sudden temperature change", text_hi: "ठंडा मौसम या तापमान में अचानक बदलाव" },
    ],
    approach:
      "Homoeopathic care for asthma is individualised to your triggers, the character of your cough or breathlessness, and your overall constitution, aiming to support the airways and reduce how often episodes occur. Your inhalers, preventer medication and asthma action plan stay in place — homoeopathy is complementary. A severe attack is a medical emergency and needs your reliever and urgent medical help immediately.",
    approachHi:
      "दमा के लिए होम्योपैथिक देखभाल आपके उत्प्रेरकों, खाँसी या साँस फूलने के स्वरूप और समग्र प्रकृति के अनुसार व्यक्तिगत होती है, जिसका उद्देश्य श्वसन मार्ग को सहारा देना और दौरों की आवृत्ति कम करना है। आपके इन्हेलर, प्रिवेंटर दवा और अस्थमा एक्शन प्लान यथावत रहते हैं — होम्योपैथी पूरक है। गंभीर दौरा एक चिकित्सा आपात स्थिति है और इसके लिए तुरंत रिलीवर और आपातकालीन चिकित्सा सहायता आवश्यक है।",
    faqs: [
      {
        q: "Can I stop my inhaler if I start homoeopathy?",
        q_hi: "क्या होम्योपैथी शुरू करने पर मैं अपना इन्हेलर बंद कर सकता/सकती हूँ?",
        a: "No. Never stop or reduce your inhaler or preventer without your treating doctor's guidance. Homoeopathy is used alongside your existing asthma care.",
        a_hi: "नहीं। अपने इलाज करने वाले चिकित्सक के मार्गदर्शन के बिना अपना इन्हेलर या प्रिवेंटर कभी बंद या कम न करें। होम्योपैथी आपकी मौजूदा दमा देखभाल के साथ प्रयोग की जाती है।",
      },
      {
        q: "What can homoeopathy help with here?",
        q_hi: "यहाँ होम्योपैथी किसमें मदद कर सकती है?",
        a: "It offers individualised supportive care that aims to reduce how often and how intensely symptoms flare, and addresses the allergic tendency as a whole.",
        a_hi: "यह व्यक्तिगत सहायक देखभाल प्रदान करती है जिसका उद्देश्य लक्षणों के बढ़ने की आवृत्ति और तीव्रता को कम करना और एलर्जिक प्रवृत्ति को समग्र रूप से देखना है।",
      },
      {
        q: "What should I avoid to reduce attacks?",
        q_hi: "दौरे कम करने के लिए मुझे किससे बचना चाहिए?",
        a: "Known triggers such as dust, smoke and cold exposure, wherever possible. Your consultation will include practical guidance tailored to your triggers.",
        a_hi: "जहाँ संभव हो, धूल, धुआँ और ठंड जैसे ज्ञात उत्प्रेरकों से। आपके परामर्श में आपके उत्प्रेरकों के अनुसार व्यावहारिक मार्गदर्शन शामिल होगा।",
      },
    ],
    references: [
      { title: "WHO — Asthma", url: "https://www.who.int/news-room/fact-sheets/detail/asthma" },
      { title: "NHS — Asthma", url: "https://www.nhs.uk/conditions/asthma/" },
    ],
    cardImage: "/photos/asthma.jpg",
    sortOrder: 3,
    published: true,
  },
  {
    slug: "eczema",
    name: "Eczema (Atopic Dermatitis)",
    nameHi: "एक्ज़िमा (एटॉपिक डर्मेटाइटिस)",
    intro:
      "Eczema makes skin dry, itchy and inflamed, often in flare-ups. Gentle, consistent care of the skin and its triggers keeps most people comfortable.",
    introHi:
      "एक्ज़िमा त्वचा को शुष्क, खुजलीदार और सूजनयुक्त बना देता है, अक्सर बार-बार उभरता है। त्वचा और उसके उत्प्रेरकों की कोमल, नियमित देखभाल अधिकांश लोगों को आरामदेह रखती है।",
    overview:
      "Atopic eczema is a common, long-term skin condition in which the skin barrier is dry and easily irritated, leading to itch, redness and recurring flare-ups. It often runs in families alongside asthma and allergies.\n\nHomoeopathy approaches skin conditions constitutionally, considering the pattern of eruption, itch, triggers and the person's overall tendencies to offer individualised supportive care. It is combined with — not a replacement for — good skin care such as regular moisturising and avoiding known irritants.",
    overviewHi:
      "एटॉपिक एक्ज़िमा एक सामान्य, दीर्घकालिक त्वचा स्थिति है जिसमें त्वचा की सुरक्षा-परत शुष्क और आसानी से चिड़चिड़ी हो जाती है, जिससे खुजली, लालिमा और बार-बार उभार होते हैं। यह अक्सर परिवारों में दमा और एलर्जी के साथ चलती है।\n\nहोम्योपैथी त्वचा रोगों को संवैधानिक रूप से देखती है, उभार के स्वरूप, खुजली, उत्प्रेरकों और व्यक्ति की समग्र प्रवृत्तियों पर विचार करके व्यक्तिगत सहायक देखभाल प्रदान करती है। यह अच्छी त्वचा देखभाल के साथ जोड़ी जाती है — जैसे नियमित मॉइस्चराइज़िंग और ज्ञात उत्तेजकों से बचना — उसके विकल्प के रूप में नहीं।",
    symptoms: [
      { text: "Dry, itchy skin", text_hi: "शुष्क, खुजलीदार त्वचा" },
      { text: "Red or inflamed patches", text_hi: "लाल या सूजनयुक्त धब्बे" },
      { text: "Rough, cracked or thickened skin", text_hi: "खुरदरी, फटी या मोटी त्वचा" },
      { text: "Flare-ups that come and go", text_hi: "बार-बार आते-जाते उभार" },
      { text: "Worsening with certain soaps, foods or weather", text_hi: "कुछ साबुन, खाद्य या मौसम से बढ़ना" },
    ],
    causes: [
      { text: "A naturally dry, sensitive skin barrier", text_hi: "स्वाभाविक रूप से शुष्क, संवेदनशील त्वचा-परत" },
      { text: "Family history of eczema, asthma or allergy", text_hi: "एक्ज़िमा, दमा या एलर्जी का पारिवारिक इतिहास" },
      { text: "Irritants such as harsh soaps or detergents", text_hi: "कठोर साबुन या डिटर्जेंट जैसे उत्तेजक" },
      { text: "Allergens and environmental factors", text_hi: "एलर्जन और पर्यावरणीय कारक" },
      { text: "Stress and dry weather", text_hi: "तनाव और शुष्क मौसम" },
    ],
    approach:
      "Homoeopathy treats eczema from the inside and the whole person outward — the remedy reflects the appearance of the skin, the nature of the itch, what makes it better or worse, and the individual's broader tendencies. The goal is individualised support of the skin's tendency to flare. Everyday moisturising and avoiding known irritants remain part of the plan, and any spreading infection needs conventional medical treatment.",
    approachHi:
      "होम्योपैथी एक्ज़िमा का उपचार भीतर से और पूरे व्यक्ति के रूप में करती है — औषधि त्वचा की बनावट, खुजली के स्वरूप, किससे राहत या वृद्धि होती है, और व्यक्ति की व्यापक प्रवृत्तियों को दर्शाती है। उद्देश्य त्वचा की उभरने की प्रवृत्ति को व्यक्तिगत सहारा देना है। रोज़ाना मॉइस्चराइज़िंग और ज्ञात उत्तेजकों से बचना योजना का हिस्सा बने रहते हैं, और फैलते संक्रमण के लिए पारंपरिक चिकित्सा उपचार आवश्यक है।",
    faqs: [
      {
        q: "Is eczema curable with homoeopathy?",
        q_hi: "क्या एक्ज़िमा होम्योपैथी से ठीक हो सकता है?",
        a: "Eczema is a tendency that is managed rather than promised a cure. Homoeopathy offers individualised support to help keep the skin calmer, alongside good daily skin care.",
        a_hi: "एक्ज़िमा एक प्रवृत्ति है जिसे प्रबंधित किया जाता है, ठीक होने का वादा नहीं किया जाता। होम्योपैथी अच्छी दैनिक त्वचा देखभाल के साथ त्वचा को शांत रखने में व्यक्तिगत सहायता प्रदान करती है।",
      },
      {
        q: "Should I stop moisturising during treatment?",
        q_hi: "क्या उपचार के दौरान मुझे मॉइस्चराइज़ करना बंद कर देना चाहिए?",
        a: "No — regular moisturising is one of the most helpful everyday measures for eczema and should continue alongside homoeopathic care.",
        a_hi: "नहीं — नियमित मॉइस्चराइज़िंग एक्ज़िमा के लिए सबसे सहायक दैनिक उपायों में से एक है और होम्योपैथिक देखभाल के साथ जारी रहनी चाहिए।",
      },
      {
        q: "Can children be treated?",
        q_hi: "क्या बच्चों का इलाज किया जा सकता है?",
        a: "Yes, eczema is common in children and remedies are gentle. Treatment is always individualised to the child's symptoms and general health.",
        a_hi: "हाँ, एक्ज़िमा बच्चों में सामान्य है और औषधियाँ कोमल होती हैं। उपचार हमेशा बच्चे के लक्षणों और सामान्य स्वास्थ्य के अनुसार व्यक्तिगत होता है।",
      },
    ],
    references: [
      { title: "NHS — Atopic eczema", url: "https://www.nhs.uk/conditions/atopic-eczema/" },
      { title: "MedlinePlus — Eczema", url: "https://medlineplus.gov/eczema.html" },
    ],
    cardImage: "/photos/eczema.jpg",
    sortOrder: 4,
    published: true,
  },
  {
    slug: "child-immunity",
    name: "Recurrent Colds & Low Immunity in Children",
    nameHi: "बच्चों में बार-बार सर्दी-ज़ुकाम एवं कम रोग-प्रतिरोधक क्षमता",
    intro:
      "Some children seem to catch one cold, throat infection or cough after another. Gentle, individualised care can support their developing immunity.",
    introHi:
      "कुछ बच्चों को एक के बाद एक सर्दी, गले का संक्रमण या खाँसी होती रहती है। कोमल, व्यक्तिगत देखभाल उनकी विकसित होती रोग-प्रतिरोधक क्षमता को सहारा दे सकती है।",
    overview:
      "It is normal for young children to get several coughs and colds a year as their immune systems mature, especially after starting daycare or school. When infections are very frequent, prolonged or repeatedly need antibiotics, parents understandably look for gentle support.\n\nHomoeopathy takes the whole child into account — the pattern of infections, appetite, sleep, temperament and recovery — to offer individualised care aimed at supporting resilience. Serious symptoms such as high fever, breathing difficulty or dehydration always need prompt conventional medical assessment.",
    overviewHi:
      "छोटे बच्चों को साल में कई बार खाँसी और सर्दी होना सामान्य है क्योंकि उनकी रोग-प्रतिरोधक प्रणाली विकसित हो रही होती है, विशेषकर डेकेयर या स्कूल शुरू करने के बाद। जब संक्रमण बहुत बार-बार, लंबे या बार-बार एंटीबायोटिक की ज़रूरत वाले हों, तो माता-पिता स्वाभाविक रूप से कोमल सहायता खोजते हैं।\n\nहोम्योपैथी पूरे बच्चे को ध्यान में रखती है — संक्रमण का स्वरूप, भूख, नींद, स्वभाव और स्वास्थ्य-लाभ — ताकि सहनशक्ति को सहारा देने के उद्देश्य से व्यक्तिगत देखभाल दी जा सके। तेज़ बुखार, साँस लेने में कठिनाई या निर्जलीकरण जैसे गंभीर लक्षणों के लिए हमेशा तुरंत पारंपरिक चिकित्सा जाँच आवश्यक है।",
    symptoms: [
      { text: "Frequent colds, cough or blocked nose", text_hi: "बार-बार सर्दी, खाँसी या बंद नाक" },
      { text: "Recurrent sore throat or tonsillitis", text_hi: "बार-बार गले में खराश या टॉन्सिलाइटिस" },
      { text: "Slow recovery between infections", text_hi: "संक्रमणों के बीच धीमा स्वास्थ्य-लाभ" },
      { text: "Repeated ear infections", text_hi: "बार-बार कान का संक्रमण" },
      { text: "Poor appetite and low energy when unwell", text_hi: "बीमार होने पर कम भूख और कम ऊर्जा" },
    ],
    causes: [
      { text: "An immune system still developing with age", text_hi: "उम्र के साथ अभी विकसित हो रही रोग-प्रतिरोधक प्रणाली" },
      { text: "Frequent exposure at daycare or school", text_hi: "डेकेयर या स्कूल में बार-बार संपर्क" },
      { text: "Allergic tendency", text_hi: "एलर्जिक प्रवृत्ति" },
      { text: "Incomplete recovery before the next infection", text_hi: "अगले संक्रमण से पहले अधूरा स्वास्थ्य-लाभ" },
      { text: "Nutritional and lifestyle factors", text_hi: "पोषण एवं जीवनशैली संबंधी कारक" },
    ],
    approach:
      "Homoeopathy for children is gentle and individualised, chosen from the child's specific pattern of illness, constitution and temperament, with the aim of supporting natural resilience so infections are less frequent or milder over time. It complements paediatric care, vaccination and good nutrition. Any high fever, breathing difficulty, drowsiness or dehydration should be seen by a doctor without delay.",
    approachHi:
      "बच्चों के लिए होम्योपैथी कोमल और व्यक्तिगत होती है, जो बच्चे की बीमारी के विशिष्ट स्वरूप, प्रकृति और स्वभाव से चुनी जाती है, जिसका उद्देश्य प्राकृतिक सहनशक्ति को सहारा देना है ताकि समय के साथ संक्रमण कम बार या हल्के हों। यह बाल-चिकित्सा देखभाल, टीकाकरण और अच्छे पोषण का पूरक है। तेज़ बुखार, साँस लेने में कठिनाई, अत्यधिक नींद या निर्जलीकरण होने पर बिना देर किए चिकित्सक को दिखाएँ।",
    faqs: [
      {
        q: "Is homoeopathy safe for young children?",
        q_hi: "क्या होम्योपैथी छोटे बच्चों के लिए सुरक्षित है?",
        a: "Remedies are given in minute, gentle doses. Always tell the doctor about any existing medicines, and continue routine vaccination and paediatric care.",
        a_hi: "औषधियाँ अत्यंत सूक्ष्म, कोमल मात्रा में दी जाती हैं। किसी भी मौजूदा दवा के बारे में चिकित्सक को हमेशा बताएँ, और नियमित टीकाकरण व बाल-चिकित्सा देखभाल जारी रखें।",
      },
      {
        q: "Does it replace antibiotics?",
        q_hi: "क्या यह एंटीबायोटिक का विकल्प है?",
        a: "No. When a doctor decides an infection needs antibiotics, that advice must be followed. Homoeopathy is supportive care for the child's overall tendency to fall ill.",
        a_hi: "नहीं। जब चिकित्सक तय करें कि संक्रमण के लिए एंटीबायोटिक आवश्यक है, तो उस सलाह का पालन करना चाहिए। होम्योपैथी बच्चे की बीमार पड़ने की समग्र प्रवृत्ति के लिए सहायक देखभाल है।",
      },
      {
        q: "How is the consultation done for a child?",
        q_hi: "बच्चे के लिए परामर्श कैसे किया जाता है?",
        a: "Through detailed questions to the parent about the child's illnesses, appetite, sleep and nature, so treatment fits that particular child.",
        a_hi: "माता-पिता से बच्चे की बीमारियों, भूख, नींद और स्वभाव के बारे में विस्तृत प्रश्नों के माध्यम से, ताकि उपचार उस विशेष बच्चे के अनुरूप हो।",
      },
    ],
    references: [
      { title: "NHS — Colds, coughs and ear infections in children", url: "https://www.nhs.uk/conditions/baby/health/colds-coughs-and-ear-infections-in-children/" },
      { title: "MedlinePlus — Common Cold", url: "https://medlineplus.gov/commoncold.html" },
    ],
    cardImage: "/photos/child-immunity.jpg",
    sortOrder: 5,
    published: true,
  },
  {
    slug: "hair-loss",
    name: "Hair Loss",
    nameHi: "बाल झड़ना",
    intro:
      "Losing more hair than usual is distressing. Understanding the cause is the first step — and much of it can be supported with individualised care.",
    introHi:
      "सामान्य से अधिक बाल झड़ना परेशान करने वाला होता है। कारण समझना पहला कदम है — और इसका बहुत कुछ व्यक्तिगत देखभाल से सहारा दिया जा सकता है।",
    overview:
      "Everyone sheds some hair daily, but noticeable thinning or increased fall can have many causes — from nutritional deficiency and thyroid or hormonal changes to stress, scalp conditions and inherited patterns. Identifying the cause guides the right care.\n\nHomoeopathy considers the whole person — the pattern of hair fall, general health, stress, diet and family history — to offer individualised support. Where an underlying medical cause such as thyroid disorder or anaemia is present, it needs proper investigation and treatment alongside homoeopathic care.",
    overviewHi:
      "हर किसी के रोज़ कुछ बाल झड़ते हैं, पर ध्यान देने योग्य पतलापन या बढ़ा हुआ झड़ना कई कारणों से हो सकता है — पोषण की कमी, थायरॉइड या हार्मोनल बदलाव से लेकर तनाव, सिर की त्वचा की स्थिति और वंशानुगत स्वरूप तक। कारण की पहचान सही देखभाल की दिशा तय करती है।\n\nहोम्योपैथी पूरे व्यक्ति पर विचार करती है — बाल झड़ने का स्वरूप, सामान्य स्वास्थ्य, तनाव, आहार और पारिवारिक इतिहास — ताकि व्यक्तिगत सहायता दी जा सके। जहाँ थायरॉइड विकार या एनीमिया जैसा कोई अंतर्निहित चिकित्सा कारण हो, उसकी उचित जाँच और उपचार होम्योपैथिक देखभाल के साथ आवश्यक है।",
    symptoms: [
      { text: "Increased hair fall or noticeable thinning", text_hi: "बालों का बढ़ा हुआ झड़ना या ध्यान देने योग्य पतलापन" },
      { text: "Receding hairline or widening parting", text_hi: "बालों की रेखा पीछे हटना या माँग का चौड़ा होना" },
      { text: "Patchy hair loss", text_hi: "जगह-जगह से बाल झड़ना" },
      { text: "Itchy, flaky or oily scalp", text_hi: "खुजलीदार, पपड़ीदार या तैलीय सिर की त्वचा" },
      { text: "Brittle, weak hair", text_hi: "कमज़ोर, भंगुर बाल" },
    ],
    causes: [
      { text: "Nutritional deficiency (iron, protein, vitamins)", text_hi: "पोषण की कमी (आयरन, प्रोटीन, विटामिन)" },
      { text: "Thyroid or hormonal changes", text_hi: "थायरॉइड या हार्मोनल बदलाव" },
      { text: "Stress or illness", text_hi: "तनाव या बीमारी" },
      { text: "Scalp conditions such as dandruff", text_hi: "सिर की त्वचा की स्थितियाँ जैसे रूसी" },
      { text: "Hereditary pattern hair loss", text_hi: "वंशानुगत पैटर्न बाल झड़ना" },
    ],
    approach:
      "Homoeopathy looks beyond the scalp to the cause — the remedy is individualised to your pattern of hair fall, general health, stress and constitution, aiming to support healthier hair growth. Where tests point to a treatable cause such as low iron or thyroid imbalance, that is addressed alongside. Realistic, honest expectations are set from the first consultation.",
    approachHi:
      "होम्योपैथी सिर की त्वचा से परे कारण को देखती है — औषधि आपके बाल झड़ने के स्वरूप, सामान्य स्वास्थ्य, तनाव और प्रकृति के अनुसार व्यक्तिगत होती है, जिसका उद्देश्य स्वस्थ बाल वृद्धि को सहारा देना है। जहाँ जाँच में कम आयरन या थायरॉइड असंतुलन जैसा उपचार योग्य कारण मिले, उसे साथ में देखा जाता है। पहले परामर्श से ही वास्तविक, ईमानदार अपेक्षाएँ रखी जाती हैं।",
    faqs: [
      {
        q: "Can homoeopathy regrow all my hair?",
        q_hi: "क्या होम्योपैथी मेरे सारे बाल वापस उगा सकती है?",
        a: "No honest practitioner can promise that. Results depend on the cause and type of hair loss. Homoeopathy offers individualised support, and outcomes are discussed realistically.",
        a_hi: "कोई ईमानदार चिकित्सक इसका वादा नहीं कर सकता। परिणाम बाल झड़ने के कारण और प्रकार पर निर्भर करते हैं। होम्योपैथी व्यक्तिगत सहायता प्रदान करती है, और परिणामों पर वास्तविक रूप से चर्चा की जाती है।",
      },
      {
        q: "Will I need any tests?",
        q_hi: "क्या मुझे कोई जाँच करानी होगी?",
        a: "Sometimes, yes. Blood tests for iron, thyroid or other causes may be suggested so the right underlying factor is addressed alongside treatment.",
        a_hi: "कभी-कभी, हाँ। आयरन, थायरॉइड या अन्य कारणों के लिए रक्त जाँच सुझाई जा सकती है ताकि उपचार के साथ सही अंतर्निहित कारक को देखा जा सके।",
      },
      {
        q: "Does diet matter?",
        q_hi: "क्या आहार मायने रखता है?",
        a: "Yes. Balanced nutrition supports hair health, and your consultation will include practical dietary and lifestyle guidance.",
        a_hi: "हाँ। संतुलित पोषण बालों के स्वास्थ्य को सहारा देता है, और आपके परामर्श में व्यावहारिक आहार व जीवनशैली मार्गदर्शन शामिल होगा।",
      },
    ],
    references: [
      { title: "NHS — Hair loss", url: "https://www.nhs.uk/conditions/hair-loss/" },
      { title: "MedlinePlus — Hair Loss", url: "https://medlineplus.gov/hairloss.html" },
    ],
    cardImage: "/photos/hair-loss.jpg",
    sortOrder: 6,
    published: true,
  },
];

/**
 * Maps a condition slug to a header mega-menu category (v2.1). Unknown slugs
 * fall under "more". Category labels are bilingual in messages (mega.cat.*).
 */
export const CONDITION_CATEGORY = {
  pcos: "womens",
  "uterine-fibroids": "womens",
  "child-immunity": "child",
  asthma: "respiratory",
  eczema: "skin",
  "hair-loss": "skin",
};

/** Display order of the mega-menu / grouping categories. */
export const CATEGORY_ORDER = ["womens", "child", "respiratory", "skin", "more"];

export function conditionCategory(slug) {
  return CONDITION_CATEGORY[slug] || "more";
}

/** Fallback card photo for a condition with no admin-set cardImage. A soft,
 * neutral wellness image is used so a newly-added condition never renders a
 * broken card. */
export const CONDITION_IMAGE_FALLBACK = "/photos/womens-health.jpg";

export function conditionImage(row) {
  return row?.cardImage || CONDITION_IMAGE_FALLBACK;
}
