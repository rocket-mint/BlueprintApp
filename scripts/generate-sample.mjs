// Generates public/sample-blueprint.xlsx — a runnable example of the
// 8-sheet structure the parser expects.
//
// Usage: node scripts/generate-sample.mjs

import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "sample-blueprint.xlsx");

// ----- 1. Sections -----
const sections = [
  { "Section ID": "pre_purchase",  "Section Name": "Pre-Purchase",  "Description": "Everything before the customer commits",  "Order": 1 },
  { "Section ID": "purchase",      "Section Name": "Purchase",      "Description": "Transaction and contract",                "Order": 2 },
  { "Section ID": "post_purchase", "Section Name": "Post-Purchase", "Description": "Onboarding through advocacy",             "Order": 3 },
];

// ----- 2. Journey Stages -----
const journeyStages = [
  { "Stage ID": "brand_awareness", "Stage Name": "Brand Awareness", "Section ID": "pre_purchase",  "Description": "Prospect first learns AppFolio exists",  "Order": 1 },
  { "Stage ID": "consideration",   "Stage Name": "Consideration",   "Section ID": "pre_purchase",  "Description": "Comparing options and shortlisting",     "Order": 2 },
  { "Stage ID": "evaluation",      "Stage Name": "Evaluation",      "Section ID": "pre_purchase",  "Description": "Hands-on demos and stakeholder buy-in",  "Order": 3 },
  { "Stage ID": "purchase",        "Stage Name": "Purchase",        "Section ID": "purchase",      "Description": "Contract, billing, and provisioning",    "Order": 4 },
  { "Stage ID": "onboarding",      "Stage Name": "Onboarding",      "Section ID": "post_purchase", "Description": "Training, data import, and go-live",     "Order": 5 },
  { "Stage ID": "adoption",        "Stage Name": "Adoption",        "Section ID": "post_purchase", "Description": "Day-to-day usage settles in",            "Order": 6 },
  { "Stage ID": "renewal",         "Stage Name": "Renewal",         "Section ID": "post_purchase", "Description": "Subscription review and renewal",        "Order": 7 },
  { "Stage ID": "advocacy",        "Stage Name": "Advocacy",        "Section ID": "post_purchase", "Description": "Referrals, reviews, case studies",       "Order": 8 },
];

// ----- 3. Phases -----
const phases = [
  { "Phase ID": "eval_self_serve", "Phase Name": "Self-Serve Exploration", "Stage ID": "evaluation", "Description": "Prospect uses product tour independently", "Order": 1 },
  { "Phase ID": "eval_guided",     "Phase Name": "Guided Demo",           "Stage ID": "evaluation", "Description": "Sales-led walkthrough",                    "Order": 2 },
  { "Phase ID": "onb_setup",       "Phase Name": "Account Setup",         "Stage ID": "onboarding", "Description": "Initial configuration and data import",    "Order": 1 },
  { "Phase ID": "onb_training",    "Phase Name": "Training",              "Stage ID": "onboarding", "Description": "Hands-on learning sessions",               "Order": 2 },
  { "Phase ID": "onb_golive",      "Phase Name": "Go-Live",               "Stage ID": "onboarding", "Description": "Switch to production usage",               "Order": 3 },
];

// ----- 4. Swimlanes (per section) -----
const swimlanes = [
  { "Swimlane ID": "sl_pre_online",   "Swimlane Name": "Doing — Online",  "Type": "moments",        "Section ID": "pre_purchase",  "Description": "Digital touchpoints", "Order": 1 },
  { "Swimlane ID": "sl_pre_motiv",    "Swimlane Name": "Motivation Map",  "Type": "motivation_map", "Section ID": "pre_purchase",  "Description": "Customer motivation", "Order": 2 },
  { "Swimlane ID": "sl_pre_offline",  "Swimlane Name": "Doing — Offline", "Type": "moments",        "Section ID": "pre_purchase",  "Description": "Human touchpoints",   "Order": 3 },
  { "Swimlane ID": "sl_pur_online",   "Swimlane Name": "Doing — Online",  "Type": "moments",        "Section ID": "purchase",      "Description": "Digital touchpoints", "Order": 4 },
  { "Swimlane ID": "sl_pur_motiv",    "Swimlane Name": "Motivation Map",  "Type": "motivation_map", "Section ID": "purchase",      "Description": "Customer motivation", "Order": 5 },
  { "Swimlane ID": "sl_pur_offline",  "Swimlane Name": "Doing — Offline", "Type": "moments",        "Section ID": "purchase",      "Description": "Human touchpoints",   "Order": 6 },
  { "Swimlane ID": "sl_post_online",  "Swimlane Name": "Doing — Online",  "Type": "moments",        "Section ID": "post_purchase", "Description": "Digital touchpoints", "Order": 7 },
  { "Swimlane ID": "sl_post_motiv",   "Swimlane Name": "Motivation Map",  "Type": "motivation_map", "Section ID": "post_purchase", "Description": "Customer motivation", "Order": 8 },
  { "Swimlane ID": "sl_post_offline", "Swimlane Name": "Doing — Offline", "Type": "moments",        "Section ID": "post_purchase", "Description": "Human touchpoints",   "Order": 9 },
];

// ----- 5. Touchpoints -----
const touchpoints = [
  // Pre-Purchase — Online
  { "Touchpoint ID": "tp_1",  "Touchpoint Name": "Social Media Ad",          "Channel Type": "Paid",     "Journey Stage": "Brand Awareness", "Swimlane ID": "sl_pre_online", "Phase IDs": "",                        "Description": "Targeted Instagram and LinkedIn ads introduce the product.", "Order": 1 },
  { "Touchpoint ID": "tp_2",  "Touchpoint Name": "Search Engine Result",     "Channel Type": "Organic",  "Journey Stage": "Brand Awareness", "Swimlane ID": "sl_pre_online", "Phase IDs": "",                        "Description": "Customer Googles property management software.",             "Order": 2 },
  { "Touchpoint ID": "tp_3",  "Touchpoint Name": "Comparison Website",       "Channel Type": "Web",      "Journey Stage": "Consideration",   "Swimlane ID": "sl_pre_online", "Phase IDs": "",                        "Description": "Reads side-by-side feature comparisons on G2 and Capterra.", "Order": 3 },
  { "Touchpoint ID": "tp_4",  "Touchpoint Name": "Pricing Page",             "Channel Type": "Web",      "Journey Stage": "Consideration",   "Swimlane ID": "sl_pre_online", "Phase IDs": "",                        "Description": "Visits the pricing page to estimate cost.",                  "Order": 4 },
  { "Touchpoint ID": "tp_5",  "Touchpoint Name": "Interactive Product Tour", "Channel Type": "App",      "Journey Stage": "Evaluation",      "Swimlane ID": "sl_pre_online", "Phase IDs": "eval_self_serve",         "Description": "Self-guided tour walks through the dashboard.",              "Order": 5 },
  { "Touchpoint ID": "tp_6",  "Touchpoint Name": "Demo Booking Flow",        "Channel Type": "Web",      "Journey Stage": "Evaluation",      "Swimlane ID": "sl_pre_online", "Phase IDs": "eval_guided",             "Description": "Picks a slot for a tailored sales demo.",                    "Order": 6 },
  // Pre-Purchase — Offline
  { "Touchpoint ID": "tp_13", "Touchpoint Name": "Industry Conference Booth", "Channel Type": "Event",    "Journey Stage": "Brand Awareness", "Swimlane ID": "sl_pre_offline", "Phase IDs": "", "Description": "Booth at NAA Apartmentalize.",                     "Order": 7 },
  { "Touchpoint ID": "tp_14", "Touchpoint Name": "Word of Mouth",             "Channel Type": "Referral", "Journey Stage": "Consideration",   "Swimlane ID": "sl_pre_offline", "Phase IDs": "", "Description": "Recommendation from a peer property manager.",     "Order": 8 },
  { "Touchpoint ID": "tp_15", "Touchpoint Name": "Sales Demo Call",           "Channel Type": "Phone",    "Journey Stage": "Evaluation",      "Swimlane ID": "sl_pre_offline", "Phase IDs": "eval_guided", "Description": "Live walkthrough with an account executive.",      "Order": 9 },
  // Purchase — Online
  { "Touchpoint ID": "tp_7",  "Touchpoint Name": "Online Checkout",          "Channel Type": "Web",      "Journey Stage": "Purchase",        "Swimlane ID": "sl_pur_online", "Phase IDs": "",                         "Description": "Enters billing details and signs the contract digitally.",  "Order": 10 },
  // Purchase — Offline
  { "Touchpoint ID": "tp_16", "Touchpoint Name": "Contract Signing",          "Channel Type": "Phone",    "Journey Stage": "Purchase",        "Swimlane ID": "sl_pur_offline", "Phase IDs": "", "Description": "Final negotiation and signature with sales.",      "Order": 11 },
  // Post-Purchase — Online
  { "Touchpoint ID": "tp_8",  "Touchpoint Name": "Welcome Email Series",     "Channel Type": "Email",    "Journey Stage": "Onboarding",      "Swimlane ID": "sl_post_online", "Phase IDs": "onb_setup",               "Description": "5-email drip with setup tasks and tips.",                   "Order": 12 },
  { "Touchpoint ID": "tp_9",  "Touchpoint Name": "Discovery Assessment",     "Channel Type": "App",      "Journey Stage": "Onboarding",      "Swimlane ID": "sl_post_online", "Phase IDs": "onb_setup",               "Description": "Personalised onboarding checklist generated from a quiz.", "Order": 13 },
  { "Touchpoint ID": "tp_9a", "Touchpoint Name": "Data Import Wizard",       "Channel Type": "App",      "Journey Stage": "Onboarding",      "Swimlane ID": "sl_post_online", "Phase IDs": "onb_setup",               "Description": "Bulk-imports tenants, leases, and properties from a CSV.", "Order": 14 },
  { "Touchpoint ID": "tp_9b", "Touchpoint Name": "Slack Onboarding Channel", "Channel Type": "Chat",     "Journey Stage": "Onboarding",      "Swimlane ID": "sl_post_online", "Phase IDs": "onb_setup, onb_training", "Description": "Dedicated channel with the implementation manager.",       "Order": 15 },
  { "Touchpoint ID": "tp_10", "Touchpoint Name": "In-App Tooltips",          "Channel Type": "App",      "Journey Stage": "Adoption",        "Swimlane ID": "sl_post_online", "Phase IDs": "",                         "Description": "Contextual hints introduce features as the user explores.","Order": 16 },
  { "Touchpoint ID": "tp_11", "Touchpoint Name": "Renewal Reminder Email",   "Channel Type": "Email",    "Journey Stage": "Renewal",         "Swimlane ID": "sl_post_online", "Phase IDs": "",                         "Description": "60- and 30-day reminders before subscription renews.",     "Order": 17 },
  { "Touchpoint ID": "tp_12", "Touchpoint Name": "Referral Program",         "Channel Type": "Web",      "Journey Stage": "Advocacy",        "Swimlane ID": "sl_post_online", "Phase IDs": "",                         "Description": "Customer earns credit for inviting peers.",                "Order": 18 },
  // Post-Purchase — Offline
  { "Touchpoint ID": "tp_17", "Touchpoint Name": "Implementation Kickoff",    "Channel Type": "Meeting",  "Journey Stage": "Onboarding",      "Swimlane ID": "sl_post_offline", "Phase IDs": "onb_setup", "Description": "Onboarding manager hosts a kickoff call.",         "Order": 19 },
  { "Touchpoint ID": "tp_18", "Touchpoint Name": "Quarterly Business Review", "Channel Type": "Meeting",  "Journey Stage": "Adoption",        "Swimlane ID": "sl_post_offline", "Phase IDs": "", "Description": "CSM reviews health metrics and roadmap.",          "Order": 20 },
  { "Touchpoint ID": "tp_19", "Touchpoint Name": "Customer Advisory Board",   "Channel Type": "Event",    "Journey Stage": "Advocacy",        "Swimlane ID": "sl_post_offline", "Phase IDs": "", "Description": "Invitation to influence the product roadmap.",     "Order": 21 },
];

// ----- 6. Callouts -----
const callouts = [
  { "Callout ID": "co_1", "Journey Stage": "Evaluation",  "Swimlane ID": "sl_pre_online", "Phase IDs": "eval_self_serve", "Type": "opportunity",  "Title": "Product tour completion rate is only 34%",         "Description": "Consider adding progress indicators and incentives to improve completion.", "Order": 1 },
  { "Callout ID": "co_2", "Journey Stage": "Purchase",    "Swimlane ID": "",            "Phase IDs": "",                "Type": "pain_point",   "Title": "Legal review delays average 6 business days",     "Description": "Procurement friction significantly extends sales cycles.",                  "Order": 1 },
  { "Callout ID": "co_3", "Journey Stage": "Onboarding",  "Swimlane ID": "sl_post_online", "Phase IDs": "onb_setup",       "Type": "highlight",    "Title": "Discovery assessment boosts retention by 18%",    "Description": "Customers who complete the quiz in week one are significantly more engaged.","Order": 1 },
  { "Callout ID": "co_4", "Journey Stage": "Adoption",    "Swimlane ID": "",             "Phase IDs": "",                "Type": "question",     "Title": "Why does feature adoption plateau at month 3?",   "Description": "Need deeper research into the adoption dip after initial onboarding.",     "Order": 1 },
  { "Callout ID": "co_5", "Journey Stage": "Renewal",     "Swimlane ID": "sl_post_online", "Phase IDs": "",                "Type": "note",         "Title": "CSM outreach at day 270 correlates with renewal", "Description": "Proactive check-in ~90 days before renewal has strong positive signal.",    "Order": 1 },
];

// ----- 7. Insights -----
const insights = [
  { "Insight ID": "insight_1", "Journey Stage": "Brand Awareness", "Insight Title": "Discovery happens on mobile",          "Insight Text": "73% of first sessions originate on a phone.",                             "Data Point": "73%",  "Data Source": "GA4, Q1 2026",            "Quote/Customer Voice": "I saw the ad on Instagram while waiting for coffee." },
  { "Insight ID": "insight_2", "Journey Stage": "Consideration",   "Insight Title": "Comparison shopping is universal",     "Insight Text": "Almost every prospect evaluates 3+ vendors before booking a demo.",       "Data Point": "3+",   "Data Source": "Sales survey, 2025",      "Quote/Customer Voice": "We had a shortlist before we ever talked to a rep." },
  { "Insight ID": "insight_3", "Journey Stage": "Evaluation",      "Insight Title": "Demos drive conviction",               "Insight Text": "Prospects who attend a live demo close at 2.4x the rate of self-serve.",  "Data Point": "2.4x",  "Data Source": "CRM cohort analysis",     "Quote/Customer Voice": "Seeing it on screen made the value click." },
  { "Insight ID": "insight_4", "Journey Stage": "Purchase",        "Insight Title": "Procurement friction is real",         "Insight Text": "Average time from verbal yes to signed contract is 11 days.",              "Data Point": "11d",  "Data Source": "Deal desk",               "Quote/Customer Voice": "Legal took longer than the demo cycle did." },
  { "Insight ID": "insight_5", "Journey Stage": "Onboarding",      "Insight Title": "First week predicts retention",        "Insight Text": "Customers who complete the discovery assessment in week one renew at 92%.","Data Point": "92%",  "Data Source": "Retention model v3",      "Quote/Customer Voice": "The checklist gave me a sense of where to start." },
  { "Insight ID": "insight_6", "Journey Stage": "Adoption",        "Insight Title": "Feature breadth matters",              "Insight Text": "Users who adopt 5+ feature areas have 3x the LTV.",                       "Data Point": "3x",   "Data Source": "Product analytics",       "Quote/Customer Voice": "Once I tried the maintenance module I never went back." },
  { "Insight ID": "insight_7", "Journey Stage": "Renewal",         "Insight Title": "Renewal is decided early",             "Insight Text": "Most renewal decisions are made at least 90 days before the contract date.","Data Point": "90d",  "Data Source": "CSM interviews",          "Quote/Customer Voice": "I had already made up my mind by Q3." },
  { "Insight ID": "insight_8", "Journey Stage": "Advocacy",        "Insight Title": "Referrals come from CSM relationships","Insight Text": "82% of referrals are made by customers who rate their CSM 9 or 10 NPS.",   "Data Point": "82%",  "Data Source": "NPS + referral tracking", "Quote/Customer Voice": "My CSM made me feel like a VIP — of course I'd recommend them." },
];

// ----- 8. Motivation Maps -----
// Uses per-stage columns with rich format: "score|Title|Description, score|Title|Description"
const motivationMaps = [
  {
    "Map ID": "mm_1",
    "Swimlane ID": "sl_pre_motiv",
    "Map Title": "Customer Motivation",
    "brand_awareness": "0.30|First impression|Prospect sees brand for the first time, 0.45|Curiosity sparked|Interest builds after initial exposure",
    "consideration":   "0.55|Shortlist research|Comparing vendors and reading reviews, 0.60|Peer validation|Hears positive word-of-mouth, 0.70|Demo booked|Commits to evaluating the product",
    "evaluation":      "0.80|Product tour|Self-guided exploration builds confidence, 0.88|Live demo wow|Sales demo addresses key concerns, 0.92|Stakeholder buy-in|Decision-maker gives the green light",
    "purchase":        "1.00|Contract signed|Peak motivation at commitment, 0.95|Slight anxiety|Post-purchase worry about implementation",
    "onboarding":      "0.70|Kickoff energy|Excited to start but overwhelmed, 0.55|Data migration dip|Friction during import and setup, 0.65|Go-live relief|System is live and working",
    "adoption":        "0.50|Feature discovery|Learning the basics, 0.40|Adoption plateau|Motivation dips as novelty wears off, 0.50|Aha moment|Discovers a key feature that clicks",
    "renewal":         "0.60|Renewal consideration|Reflecting on value received, 0.70|Renewed confidence|Decides the tool is indispensable",
    "advocacy":        "0.85|Referral mindset|Willing to recommend to peers, 0.92|Public endorsement|Leaves a review or case study, 0.95|Brand champion|Actively evangelizes the product",
    "Key Drivers": "Cost predictability, time savings, integrations with existing systems",
    "Emotional Triggers": "Fear of switching pain, frustration with manual workflows, hope for fewer late-night calls",
    "Key Insights": "Motivation peaks at Purchase but dips during Adoption — invest in onboarding nudges",
    "Visual/Color": "#8073ff",
  },
];

// ----- Build the workbook -----
const wb = XLSX.utils.book_new();

function addSheet(name, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const headers = Object.keys(rows[0] ?? {});
  ws["!cols"] = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[h] ?? "").length),
    );
    return { wch: Math.min(60, Math.max(12, maxLen + 2)) };
  });
  XLSX.utils.book_append_sheet(wb, ws, name);
}

addSheet("Sections", sections);
addSheet("Journey Stages", journeyStages);
addSheet("Phases", phases);
addSheet("Swimlanes", swimlanes);
addSheet("Touchpoints", touchpoints);
addSheet("Callouts", callouts);
addSheet("Insights", insights);
addSheet("Motivation Maps", motivationMaps);

mkdirSync(dirname(OUT), { recursive: true });
const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(OUT, buffer);

console.log("Wrote " + OUT);
console.log("  " + sections.length + " sections");
console.log("  " + journeyStages.length + " stages");
console.log("  " + phases.length + " phases");
console.log("  " + swimlanes.length + " swimlanes");
console.log("  " + touchpoints.length + " touchpoints");
console.log("  " + callouts.length + " callouts");
console.log("  " + insights.length + " insights");
console.log("  " + motivationMaps.length + " motivation map(s)");
