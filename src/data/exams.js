/*
 * Exam database. `official: true` means the speed/duration is taken from recent
 * official notifications; `official: false` means the recruiting body sets the
 * standard per notification and the numbers shown are recommended practice targets.
 * Always confirm with the latest notification before the exam.
 */
const CATEGORIES = [
  { id: "central", name: "SSC & Central Govt", short: "SSC & Central" },
  { id: "railway", name: "Railway & Police", short: "Railway & Police" },
  { id: "court", name: "High Court & Judiciary", short: "Courts" },
  { id: "state", name: "State Govt Exams", short: "State Exams" }
];

const ALL_HI = ["remington", "krutidev", "inscript"];
const SSC_HI = ["remington", "inscript"];

const exams = [
  // ---------------- SSC & Central ----------------
  {
    slug: "ssc-chsl", name: "SSC CHSL", full: "SSC CHSL (LDC / JSA) Typing Test", category: "central", popular: true,
    body: "Staff Selection Commission (SSC)", posts: "Lower Division Clerk (LDC), Junior Secretariat Assistant (JSA)",
    languages: ["en", "hi"], layouts: SSC_HI, speed: { en: 35, hi: 30 }, duration: 10, official: true, backspace: true,
    notes: [
      "English at 35 WPM equals about 10,500 key depressions per hour; Hindi at 30 WPM equals about 9,000 KDPH.",
      "Qualifying in nature — marks do not add to the merit, but you must clear it.",
      "The typing language is the one you selected in the online application.",
      "Hindi candidates can type in Remington GAIL or Inscript layout on the CBT software."
    ]
  },
  {
    slug: "ssc-chsl-deo-dest", name: "SSC CHSL DEO (DEST)", full: "SSC CHSL DEO — Data Entry Speed Test (DEST)", category: "central", popular: true,
    body: "Staff Selection Commission (SSC)", posts: "Data Entry Operator (DEO), DEO Grade A",
    languages: ["en"], speed: { en: 27 }, kdph: 8000, duration: 15, official: true, backspace: true,
    notes: [
      "Speed of 8,000 key depressions per hour on computer.",
      "An English passage of about 2,000–2,200 key depressions must be typed in 15 minutes.",
      "Accuracy matters as much as speed — the notification defines how errors are counted."
    ]
  },
  {
    slug: "ssc-cgl-dest", name: "SSC CGL DEST", full: "SSC CGL Tax Assistant — Data Entry Skill Test (DEST)", category: "central", popular: true,
    body: "Staff Selection Commission (SSC)", posts: "Tax Assistant (CBIC & CBDT)",
    languages: ["en"], speed: { en: 27 }, kdph: 8000, duration: 15, official: true, backspace: true,
    notes: [
      "Data Entry Skill Test of 8,000 key depressions per hour.",
      "About 2,000 key depressions of English text in 15 minutes.",
      "Only candidates who opted for Tax Assistant posts need to appear."
    ]
  },
  {
    slug: "epfo-ssa", name: "EPFO SSA", full: "EPFO Social Security Assistant Typing Test", category: "central",
    body: "Employees' Provident Fund Organisation (EPFO)", posts: "Social Security Assistant (SSA)",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 35, hi: 30 }, duration: 10, official: true, backspace: true,
    notes: ["Computer typing skill test, qualifying in nature.", "English 35 WPM or Hindi 30 WPM as per recent notifications."]
  },
  {
    slug: "kvs-jsa", name: "KVS JSA", full: "KVS Junior Secretariat Assistant Typing Test", category: "central",
    body: "Kendriya Vidyalaya Sangathan (KVS)", posts: "Junior Secretariat Assistant (JSA / LDC)",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 35, hi: 30 }, duration: 10, official: true, backspace: true,
    notes: ["Skill test on computer, qualifying in nature.", "English 35 WPM or Hindi 30 WPM."]
  },
  {
    slug: "dsssb-ldc", name: "DSSSB LDC", full: "DSSSB LDC / Junior Assistant Typing Test", category: "central",
    body: "Delhi Subordinate Services Selection Board (DSSSB)", posts: "LDC, Junior Assistant, Junior Judicial Assistant",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 35, hi: 30 }, duration: 10, official: true, backspace: true,
    notes: ["Skill test on computer after the written exam.", "English 35 WPM or Hindi 30 WPM for clerical posts."]
  },

  // ---------------- Railway & Police ----------------
  {
    slug: "rrb-ntpc-graduate", name: "RRB NTPC (Graduate)", full: "RRB NTPC Graduate Typing Skill Test", category: "railway", popular: true,
    body: "Railway Recruitment Boards (RRB)", posts: "Junior Accounts Assistant cum Typist, Senior Clerk cum Typist",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 30, hi: 25 }, duration: 10, official: true, backspace: true,
    notes: [
      "Typing Skill Test (TST) on a personal computer, qualifying in nature.",
      "English 30 WPM or Hindi 25 WPM.",
      "No editing tools or spell-check facility is available during the test."
    ]
  },
  {
    slug: "rrb-ntpc-undergraduate", name: "RRB NTPC (Undergraduate)", full: "RRB NTPC Undergraduate Typing Skill Test", category: "railway", popular: true,
    body: "Railway Recruitment Boards (RRB)", posts: "Accounts Clerk cum Typist, Junior Clerk cum Typist",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 30, hi: 25 }, duration: 10, official: true, backspace: true,
    notes: [
      "Typing Skill Test (TST) on a personal computer, qualifying in nature.",
      "English 30 WPM or Hindi 25 WPM.",
      "No editing tools or spell-check facility is available during the test."
    ]
  },
  {
    slug: "capf-hcm", name: "CAPF Head Constable (Min.)", full: "CAPF Head Constable Ministerial Typing Test", category: "railway",
    body: "CRPF / BSF / CISF / ITBP / SSB", posts: "Head Constable (Ministerial), ASI (Stenographer) — typing part",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 35, hi: 30 }, duration: 10, official: true, backspace: true,
    notes: ["Skill test on computer after the written exam and PST.", "English 35 WPM (10,500 KDPH) or Hindi 30 WPM (9,000 KDPH)."]
  },
  {
    slug: "delhi-police-hcm", name: "Delhi Police HC (Min.)", full: "Delhi Police Head Constable (Ministerial) Typing Test", category: "railway",
    body: "Staff Selection Commission for Delhi Police", posts: "Head Constable (Ministerial)",
    languages: ["en", "hi"], layouts: SSC_HI, speed: { en: 30, hi: 25 }, duration: 10, official: true, backspace: true,
    notes: ["Typing test on computer, qualifying in nature.", "English 30 WPM or Hindi 25 WPM."]
  },
  {
    slug: "up-police-asi-clerk", name: "UP Police ASI Clerk", full: "UP Police ASI (Clerk) Hindi Typing Test", category: "railway",
    body: "UP Police Recruitment & Promotion Board (UPPRPB)", posts: "ASI (Clerk), Head Operator-type ministerial posts",
    languages: ["hi"], layouts: ALL_HI, speed: { hi: 25 }, duration: 10, official: false, backspace: true, defaultLayout: "remington",
    notes: ["Hindi computer typing is tested for clerk posts; the notification lays down the exact speed and marking.", "Practise Krutidev/Remington and Mangal — check which font is offered at the centre."]
  },

  // ---------------- Courts ----------------
  {
    slug: "supreme-court-jca", name: "Supreme Court JCA", full: "Supreme Court Junior Court Assistant Typing Test", category: "court", popular: true,
    body: "Supreme Court of India", posts: "Junior Court Assistant (JCA)",
    languages: ["en"], speed: { en: 35 }, duration: 10, official: true, backspace: true,
    notes: ["English typing test on computer with a minimum speed of 35 WPM.", "Error tolerance and evaluation are defined in the notification."]
  },
  {
    slug: "delhi-high-court-jja", name: "Delhi High Court JJA", full: "Delhi High Court JJA Typing Test", category: "court",
    body: "High Court of Delhi", posts: "Junior Judicial Assistant (JJA), Restorer",
    languages: ["en"], speed: { en: 35 }, duration: 10, official: true, backspace: true,
    notes: ["English typing on computer at 35 WPM.", "Legal vocabulary (petitioner, respondent, affidavit) appears often in passages."]
  },
  {
    slug: "allahabad-high-court", name: "Allahabad High Court", full: "Allahabad High Court Typing Test (Computer Assistant, RO/ARO)", category: "court", popular: true,
    body: "High Court of Judicature at Allahabad", posts: "Computer Assistant, Review Officer (RO), Assistant Review Officer (ARO)",
    languages: ["hi", "en"], layouts: ALL_HI, speed: { hi: 25, en: 30 }, duration: 10, official: false, backspace: true, defaultLayout: "remington",
    notes: ["Typing on computer in Hindi and/or English depending on the post.", "Practise legal Hindi vocabulary: याचिका, प्रतिवादी, न्यायालय, आदेश."]
  },
  {
    slug: "rajasthan-high-court", name: "Rajasthan High Court", full: "Rajasthan High Court JJA / Clerk Typing Test", category: "court",
    body: "Rajasthan High Court", posts: "Junior Judicial Assistant, Clerk Grade II",
    languages: ["hi", "en"], layouts: ALL_HI, speed: { hi: 25, en: 30 }, duration: 10, official: false, backspace: true, defaultLayout: "krutidev",
    notes: ["Computer typing test in Hindi and English; speed is measured in key depressions/words as laid down in the notification.", "Krutidev 010 (Remington) is widely used by Rajasthan candidates."]
  },
  {
    slug: "patna-high-court", name: "Patna High Court", full: "Patna High Court Assistant Typing Test", category: "court",
    body: "Patna High Court", posts: "Assistant, Clerk, Typist",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 30, hi: 25 }, duration: 10, official: false, backspace: true,
    notes: ["Typing test forms part of the skill test for clerical posts.", "Check the notification for language and speed."]
  },
  {
    slug: "mp-high-court", name: "MP High Court", full: "MP High Court Assistant / Stenotypist Typing Test", category: "court",
    body: "High Court of Madhya Pradesh", posts: "Assistant Grade III, Stenotypist, JJA",
    languages: ["hi", "en"], layouts: ALL_HI, speed: { hi: 25, en: 30 }, duration: 10, official: false, backspace: true, defaultLayout: "inscript",
    notes: ["Hindi and English computer typing tests are common for clerical posts.", "MP candidates often also hold a CPCT score — practise both."]
  },
  {
    slug: "bihar-civil-court-clerk", name: "Bihar Civil Court Clerk", full: "Bihar Civil Court Clerk Typing Test", category: "court",
    body: "Patna High Court (for Bihar Civil Courts)", posts: "Clerk, Stenographer, Court Reader cum Deposition Writer",
    languages: ["hi", "en"], layouts: ALL_HI, speed: { hi: 25, en: 30 }, duration: 10, official: false, backspace: true, defaultLayout: "krutidev",
    notes: ["Computer skill/typing test may be part of the selection for some posts.", "Hindi typing in Krutidev or Mangal is common in Bihar."]
  },

  // ---------------- State ----------------
  {
    slug: "cpct", name: "CPCT (MP)", full: "CPCT Typing Test — MP Computer Proficiency Certification Test", category: "state", popular: true,
    body: "MAP_IT, Government of Madhya Pradesh", posts: "Data Entry Operator, Assistant Grade III, clerical posts in MP",
    languages: ["en", "hi"], layouts: ["inscript", "remington"], speed: { en: 30, hi: 20 }, duration: 15, official: true, backspace: true,
    notes: [
      "Separate English and Hindi typing sections, each 15 minutes, after the MCQ section.",
      "Scorecard reports Net WPM and accuracy; required speed depends on the post (commonly English 30, Hindi 20 NWPM).",
      "Hindi typing can be done in Inscript or Remington GAIL."
    ]
  },
  {
    slug: "upsssc-junior-assistant", name: "UPSSSC Junior Assistant", full: "UPSSSC Junior Assistant Typing Test", category: "state", popular: true,
    body: "UP Subordinate Services Selection Commission (UPSSSC)", posts: "Junior Assistant, Junior Clerk",
    languages: ["hi", "en"], layouts: ALL_HI, speed: { hi: 25, en: 30 }, duration: 10, official: true, backspace: true, defaultLayout: "krutidev",
    notes: ["Hindi 25 WPM and English 30 WPM on computer.", "Krutidev/Remington is the most practised Hindi layout in UP."]
  },
  {
    slug: "uppsc-ro-aro", name: "UPPSC RO/ARO", full: "UPPSC RO / ARO Hindi Typing Test", category: "state",
    body: "Uttar Pradesh Public Service Commission (UPPSC)", posts: "Review Officer, Assistant Review Officer",
    languages: ["hi"], layouts: ALL_HI, speed: { hi: 25 }, duration: 10, official: true, backspace: true, defaultLayout: "krutidev",
    notes: ["Hindi typing test on computer at 25 WPM for ARO posts.", "Held after the mains examination."]
  },
  {
    slug: "rsmssb-ldc", name: "RSMSSB LDC", full: "RSMSSB LDC / Junior Assistant Typing Test (Rajasthan)", category: "state", popular: true,
    body: "Rajasthan Staff Selection Board (RSSB)", posts: "LDC, Junior Assistant, Clerk Grade II",
    languages: ["hi", "en"], layouts: ALL_HI, speed: { hi: 25, en: 30 }, duration: 10, official: false, backspace: true, defaultLayout: "krutidev",
    notes: ["Phase II typing test on computer in both Hindi and English.", "Speed is prescribed in key depressions per hour in the notification — check the latest rules."]
  },
  {
    slug: "hssc-clerk", name: "HSSC Clerk", full: "HSSC Clerk Typing Test (Haryana)", category: "state",
    body: "Haryana Staff Selection Commission (HSSC)", posts: "Clerk, Data Entry Operator",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 30, hi: 25 }, duration: 10, official: false, backspace: true,
    notes: ["Computer typing test is qualifying for clerical posts.", "Many candidates also take the HARTRON typing certificate."]
  },
  {
    slug: "hartron-typing-test", name: "HARTRON Typing Test", full: "HARTRON SETC Typing Test (Haryana)", category: "state",
    body: "HARTRON (Haryana State Electronics Development Corporation)", posts: "Typing certificate for Haryana govt jobs",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 30, hi: 25 }, duration: 10, official: false, backspace: true,
    notes: ["Certification-style typing exam used for Haryana recruitment.", "Practise both English and Hindi at exam speed."]
  },
  {
    slug: "bssc-inter-level", name: "BSSC Inter Level", full: "BSSC Inter Level Typing Test (Bihar)", category: "state",
    body: "Bihar Staff Selection Commission (BSSC)", posts: "LDC, Typist and other inter-level posts with typing",
    languages: ["hi", "en"], layouts: ALL_HI, speed: { hi: 25, en: 30 }, duration: 10, official: false, backspace: true, defaultLayout: "krutidev",
    notes: ["Typing is tested only for posts that require it.", "Hindi typing in Krutidev or Mangal is widely practised in Bihar."]
  },
  {
    slug: "beltron-deo", name: "BELTRON DEO", full: "BELTRON DEO Typing Test (Bihar)", category: "state",
    body: "Bihar State Electronics Development Corporation (BELTRON)", posts: "Data Entry Operator, Programmer (skill test)",
    languages: ["en", "hi"], layouts: ALL_HI, speed: { en: 30, hi: 25 }, duration: 10, official: false, backspace: true,
    notes: ["Typing speed test in Hindi and English for DEO panels.", "Accuracy is checked strictly — practise with highlight off."]
  },
  {
    slug: "psssb-clerk", name: "PSSSB Clerk", full: "PSSSB Clerk English Typing Test (Punjab)", category: "state",
    body: "Punjab Subordinate Services Selection Board (PSSSB)", posts: "Clerk, Clerk-cum-Data Entry Operator",
    languages: ["en"], speed: { en: 30 }, duration: 10, official: false, backspace: true,
    notes: ["English typing is tested along with Punjabi typing.", "Punjabi typing practice is not available on this site yet."]
  }
];

const LAYOUT_NAMES = { qwerty: "English QWERTY", inscript: "Mangal Inscript", remington: "Remington GAIL", krutidev: "Krutidev 010" };

exams.forEach((e) => {
  e.layouts = e.layouts || [];
  const parts = [];
  if (e.kdph) parts.push(`${e.kdph.toLocaleString("en-IN")} key depressions/hour (English)`);
  else {
    if (e.speed.en) parts.push(`English ${e.speed.en} WPM`);
    if (e.speed.hi) parts.push(`Hindi ${e.speed.hi} WPM`);
  }
  e.requirementText = parts.join(" · ") + ` in ${e.duration} minutes` + (e.official ? "" : " (practice target)");
  e.defaultLayout = e.defaultLayout || (e.languages.includes("en") ? "qwerty" : "remington");
  e.layoutNames = e.layouts.map((l) => LAYOUT_NAMES[l]);
});

module.exports = { exams, CATEGORIES, LAYOUT_NAMES };
