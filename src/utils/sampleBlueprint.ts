import type { Blueprint } from "../types/blueprint";

/**
 * Sample blueprint demonstrating phase-group nesting:
 * - StageGroups cluster stages under a shared header row
 * - Phase groups subdivide each stage into discrete sub-steps
 * - Phase-group swimlane touchpoints are children of a specific phase (phaseId set)
 * - Orphan swimlanes (no phaseId) render one stage-level cell per stage
 */
export function createSampleBlueprint(): Blueprint {
  return {
    // ── Section ────────────────────────────────────────────────────────────
    sections: [
      {
        id: "sec-main",
        name: "Customer Onboarding Journey",
        description: "From first contact through go-live.",
        stageLabel: "Stage",
        stageGroupLabel: "Phase",
        order: 1,
      },
    ],

    // ── Stage Groups ───────────────────────────────────────────────────────
    stageGroups: [
      { id: "sg-sell",   name: "Sell",    sectionId: "sec-main", order: 1 },
      { id: "sg-onboard", name: "Onboard", sectionId: "sec-main", order: 2 },
    ],

    // ── Journey Stages ─────────────────────────────────────────────────────
    journeyStages: [
      {
        id: "st-qualify",
        name: "Qualify",
        sectionId: "sec-main",
        stageGroupId: "sg-sell",
        description: "Sales team identifies fit and runs discovery.",
        order: 1,
      },
      {
        id: "st-close",
        name: "Close",
        sectionId: "sec-main",
        stageGroupId: "sg-sell",
        description: "Contract negotiated and signed.",
        order: 2,
      },
      {
        id: "st-kickoff",
        name: "Kickoff",
        sectionId: "sec-main",
        stageGroupId: "sg-onboard",
        description: "Onboarding team introduced and project opened.",
        order: 3,
      },
      {
        id: "st-configure",
        name: "Configure",
        sectionId: "sec-main",
        stageGroupId: "sg-onboard",
        description: "Product set up to match customer requirements.",
        order: 4,
      },
      {
        id: "st-golive",
        name: "Go Live",
        sectionId: "sec-main",
        stageGroupId: "sg-onboard",
        description: "Customer goes live and success is confirmed.",
        order: 5,
      },
    ],

    // ── Phases ─────────────────────────────────────────────────────────────
    // All phases share groupId "pg-steps" so they form one "Step" header row.
    // Each stage has 2 sub-steps, making the nesting easy to compare across columns.
    phases: [
      // Qualify
      { id: "ph-q1", name: "Discovery Call",   stageId: "st-qualify",   groupId: "pg-steps", groupLabel: "Step", order: 10 },
      { id: "ph-q2", name: "Product Demo",     stageId: "st-qualify",   groupId: "pg-steps", groupLabel: "Step", order: 20 },
      // Close
      { id: "ph-c1", name: "Proposal Sent",    stageId: "st-close",     groupId: "pg-steps", groupLabel: "Step", order: 30 },
      { id: "ph-c2", name: "Contract Signed",  stageId: "st-close",     groupId: "pg-steps", groupLabel: "Step", order: 40 },
      // Kickoff
      { id: "ph-k1", name: "Intro Meeting",    stageId: "st-kickoff",   groupId: "pg-steps", groupLabel: "Step", order: 50 },
      { id: "ph-k2", name: "Project Setup",    stageId: "st-kickoff",   groupId: "pg-steps", groupLabel: "Step", order: 60 },
      // Configure
      { id: "ph-cf1", name: "Requirements",    stageId: "st-configure", groupId: "pg-steps", groupLabel: "Step", order: 70 },
      { id: "ph-cf2", name: "Build & Test",    stageId: "st-configure", groupId: "pg-steps", groupLabel: "Step", order: 80 },
      // Go Live
      { id: "ph-g1", name: "UAT",              stageId: "st-golive",    groupId: "pg-steps", groupLabel: "Step", order: 90 },
      { id: "ph-g2", name: "Launch",           stageId: "st-golive",    groupId: "pg-steps", groupLabel: "Step", order: 100 },
    ],

    // ── Swimlanes ──────────────────────────────────────────────────────────
    // Orphan swimlanes (no phaseId) → one cell per stage.
    // Phase-group swimlanes (phaseId = "pg-steps") → one sub-cell per phase.
    swimlanes: [
      // Orphan — stage-level summary rows
      {
        id: "sl-customer",
        name: "Customer Actions",
        type: "moments",
        sectionId: "sec-main",
        description: "What the customer does at each stage.",
        order: 10,
      },
      {
        id: "sl-internal",
        name: "Internal Actions",
        type: "moments",
        sectionId: "sec-main",
        description: "What our team does at each stage.",
        order: 20,
      },
      // Phase-group — per-step detail rows
      {
        id: "sl-customer-steps",
        name: "Customer Step Detail",
        type: "moments",
        sectionId: "sec-main",
        phaseId: "pg-steps",
        description: "Detailed customer actions within each step.",
        order: 30,
      },
      {
        id: "sl-internal-steps",
        name: "Internal Step Detail",
        type: "moments",
        sectionId: "sec-main",
        phaseId: "pg-steps",
        description: "Detailed internal actions within each step.",
        order: 40,
      },
      {
        id: "sl-systems",
        name: "Systems & Tools",
        type: "moments",
        sectionId: "sec-main",
        phaseId: "pg-steps",
        description: "Tools and automation triggered at each step.",
        order: 50,
      },
    ],

    // ── Touchpoints ────────────────────────────────────────────────────────
    // Orphan swimlane touchpoints: stageId set, no phaseId.
    // Phase-group swimlane touchpoints: both stageId AND phaseId set.
    touchpoints: [
      // ── Customer Actions (orphan — one per stage) ──
      { id: "tp-ca-qualify",   name: "Evaluates solution fit",          stageId: "st-qualify",   swimlaneId: "sl-customer",       order: 10, photos: [], links: [] },
      { id: "tp-ca-close",     name: "Reviews and signs contract",      stageId: "st-close",     swimlaneId: "sl-customer",       order: 10, photos: [], links: [] },
      { id: "tp-ca-kickoff",   name: "Attends kickoff meeting",         stageId: "st-kickoff",   swimlaneId: "sl-customer",       order: 10, photos: [], links: [] },
      { id: "tp-ca-configure", name: "Validates configuration",         stageId: "st-configure", swimlaneId: "sl-customer",       order: 10, photos: [], links: [] },
      { id: "tp-ca-golive",    name: "Completes UAT and launches",      stageId: "st-golive",    swimlaneId: "sl-customer",       order: 10, photos: [], links: [] },

      // ── Internal Actions (orphan — one per stage) ──
      { id: "tp-ia-qualify",   name: "Qualifies lead in CRM",           stageId: "st-qualify",   swimlaneId: "sl-internal",       order: 10, photos: [], links: [] },
      { id: "tp-ia-close",     name: "Legal review and countersign",    stageId: "st-close",     swimlaneId: "sl-internal",       order: 10, photos: [], links: [] },
      { id: "tp-ia-kickoff",   name: "Opens onboarding project",        stageId: "st-kickoff",   swimlaneId: "sl-internal",       order: 10, photos: [], links: [] },
      { id: "tp-ia-configure", name: "Builds and QA tests setup",       stageId: "st-configure", swimlaneId: "sl-internal",       order: 10, photos: [], links: [] },
      { id: "tp-ia-golive",    name: "Confirms go-live readiness",      stageId: "st-golive",    swimlaneId: "sl-internal",       order: 10, photos: [], links: [] },

      // ── Customer Step Detail (phase-group — phaseId required) ──
      { id: "tp-cs-q1",  name: "Joins discovery call",          stageId: "st-qualify",   phaseId: "ph-q1",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-q2",  name: "Watches product demo",          stageId: "st-qualify",   phaseId: "ph-q2",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-c1",  name: "Reviews proposal document",     stageId: "st-close",     phaseId: "ph-c1",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-c2",  name: "Signs agreement electronically",stageId: "st-close",     phaseId: "ph-c2",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-k1",  name: "Meets onboarding team",         stageId: "st-kickoff",   phaseId: "ph-k1",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-k2",  name: "Reviews project timeline",      stageId: "st-kickoff",   phaseId: "ph-k2",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-cf1", name: "Submits requirements form",     stageId: "st-configure", phaseId: "ph-cf1", swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-cf2", name: "Tests configuration in staging",stageId: "st-configure", phaseId: "ph-cf2", swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-g1",  name: "Runs user acceptance testing",  stageId: "st-golive",    phaseId: "ph-g1",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },
      { id: "tp-cs-g2",  name: "Gives go-live approval",        stageId: "st-golive",    phaseId: "ph-g2",  swimlaneId: "sl-customer-steps", order: 10, photos: [], links: [] },

      // ── Internal Step Detail (phase-group — phaseId required) ──
      { id: "tp-is-q1",  name: "Prepares discovery agenda",     stageId: "st-qualify",   phaseId: "ph-q1",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-q2",  name: "Configures demo environment",   stageId: "st-qualify",   phaseId: "ph-q2",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-c1",  name: "Drafts and sends proposal",     stageId: "st-close",     phaseId: "ph-c1",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-c2",  name: "Countersigns and files contract",stageId: "st-close",    phaseId: "ph-c2",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-k1",  name: "Runs intro call with customer", stageId: "st-kickoff",   phaseId: "ph-k1",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-k2",  name: "Creates project in PM tool",    stageId: "st-kickoff",   phaseId: "ph-k2",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-cf1", name: "Maps requirements to config",   stageId: "st-configure", phaseId: "ph-cf1", swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-cf2", name: "Builds and runs QA suite",      stageId: "st-configure", phaseId: "ph-cf2", swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-g1",  name: "Supports UAT sessions",         stageId: "st-golive",    phaseId: "ph-g1",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },
      { id: "tp-is-g2",  name: "Executes production deployment",stageId: "st-golive",    phaseId: "ph-g2",  swimlaneId: "sl-internal-steps", order: 10, photos: [], links: [] },

      // ── Systems & Tools (phase-group — phaseId required) ──
      { id: "tp-sy-q1",  name: "CRM: lead record created",      stageId: "st-qualify",   phaseId: "ph-q1",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-q2",  name: "Demo: screen share started",    stageId: "st-qualify",   phaseId: "ph-q2",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-c1",  name: "DocuSign: proposal sent",       stageId: "st-close",     phaseId: "ph-c1",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-c2",  name: "DocuSign: contract executed",   stageId: "st-close",     phaseId: "ph-c2",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-k1",  name: "Slack: welcome channel created",stageId: "st-kickoff",   phaseId: "ph-k1",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-k2",  name: "Jira: project board created",   stageId: "st-kickoff",   phaseId: "ph-k2",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-cf1", name: "Notion: requirements doc shared",stageId: "st-configure",phaseId: "ph-cf1", swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-cf2", name: "Staging env: test run triggered",stageId: "st-configure",phaseId: "ph-cf2", swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-g1",  name: "UAT portal: test cases loaded", stageId: "st-golive",    phaseId: "ph-g1",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
      { id: "tp-sy-g2",  name: "Prod: deployment pipeline run", stageId: "st-golive",    phaseId: "ph-g2",  swimlaneId: "sl-systems", order: 10, photos: [], links: [] },
    ],

    // ── Callouts ───────────────────────────────────────────────────────────
    // Phase-group callouts must have phaseId to render in the correct sub-cell.
    callouts: [
      {
        id: "co-pain-demo",
        stageId: "st-qualify",
        swimlaneId: "sl-customer-steps",
        phaseIds: ["ph-q2"],
        type: "pain_point",
        title: "Demo fatigue",
        description: "Prospects often see multiple demos. Personalise to their use case to stand out.",
        order: 1,
      },
      {
        id: "co-opp-contract",
        stageId: "st-close",
        swimlaneId: "sl-internal-steps",
        phaseIds: ["ph-c2"],
        type: "opportunity",
        title: "Warm handoff",
        description: "A joint intro call between sales and onboarding at signing significantly improves retention.",
        order: 1,
      },
      {
        id: "co-highlight-kickoff",
        stageId: "st-kickoff",
        swimlaneId: "sl-customer-steps",
        phaseIds: [],
        type: "highlight",
        title: "High-impact moment",
        description: "The kickoff sets the tone for the entire onboarding. This callout spans all kickoff phases.",
        order: 1,
      },
    ],

    motivationMaps: [],
  };
}
