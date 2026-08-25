#!/usr/bin/env node
/**
 * Seeds the database with a handful of realistic demo projects.
 *
 *   node scripts/seed.mjs           # insert only when the collection is empty
 *   node scripts/seed.mjs --force   # wipe existing projects and re-seed
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

function loadEnvFile() {
  try {
    const content = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      if (!(match[1] in process.env)) process.env[match[1]] = value;
    }
  } catch {
    // no .env file — that's fine
  }
}

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const cover = (seed) => `https://picsum.photos/seed/${seed}/800/450`;

const demoProjects = [
  {
    title: "Project Hub",
    description:
      "This very tool — an internal hub to store, browse, search and open every project we build in one clean place.",
    coverImage: cover("project-hub"),
    projectUrl: "https://project-hub.example.com",
    githubUrl: "https://github.com/our-org/project-hub",
    status: "Active",
    projectType: "Web App",
    tags: ["Next.js", "TypeScript", "MongoDB", "Tailwind", "Arena AI"],
    favorite: true,
    notes: "Internal tool — two users only. Keep it simple, never let it grow into a SaaS.",
    aiDocumentation: [
      "# Project Hub — AI Documentation",
      "",
      "Context for AI agents (Arena AI, Claude Code, etc.) working on this repository.",
      "",
      "## Project rules",
      "- Keep the app simple and minimal. Do not over-engineer.",
      "- Always prefer the simplest reliable solution.",
      "- Dark mode only, one restrained accent color, flat design.",
      "",
      "## Tech stack",
      "- Next.js (App Router) + TypeScript",
      "- Tailwind CSS v4",
      "- MongoDB via the official driver (no ORM)",
      "",
      "## Commands",
      "- `npm run dev` — start the dev server",
      "- `npm run build` — production build",
      "- `npm run seed` — insert demo projects",
      "",
      "## Coding conventions",
      "- Server components by default; add `\"use client\"` only when needed.",
      "- Every API route validates input with zod before touching the database.",
      "- Keep components small and reusable: `ui/` for primitives, `projects/` for domain components.",
    ].join("\n"),
    createdAt: daysAgo(120),
    updatedAt: daysAgo(1),
  },
  {
    title: "Marketplace Webstore",
    description:
      "Customer-facing e-commerce marketplace with vendor storefronts, checkout and order management.",
    coverImage: cover("marketplace"),
    projectUrl: "https://marketplace.example.com",
    githubUrl: "https://github.com/our-org/marketplace",
    adminPanelUrl: "https://marketplace.example.com/admin",
    status: "In Development",
    projectType: "Web App",
    tags: ["Next.js", "React", "Tailwind", "MongoDB"],
    favorite: false,
    notes: "Stripe test keys are in the shared vault. Do a design review before launch.",
    aiDocumentation: [
      "# Marketplace — AI Guidelines",
      "",
      "## Conventions",
      "- App Router, server components for data fetching.",
      "- All money values are stored as integer cents.",
      "",
      "## Constraints",
      "- Never store raw card data — Stripe elements only.",
      "- Vendor payout logic lives in `src/lib/payouts.ts`; touch with care.",
    ].join("\n"),
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3),
  },
  {
    title: "Analytics Dashboard",
    description:
      "Internal analytics dashboard for revenue, retention and funnel metrics across all products.",
    coverImage: cover("analytics"),
    projectUrl: "https://analytics.example.com",
    githubUrl: "https://github.com/our-org/analytics",
    adminPanelUrl: "https://analytics.example.com/admin",
    status: "Active",
    projectType: "Dashboard",
    tags: ["React", "TypeScript", "D3"],
    favorite: true,
    notes: "Nightly ETL job runs at 03:00 UTC — if numbers look stale, check the cron.",
    aiDocumentation: "",
    createdAt: daysAgo(200),
    updatedAt: daysAgo(6),
  },
  {
    title: "Fitness Tracker App",
    description:
      "Cross-platform mobile app for workout tracking, with offline sync and wearable integration.",
    coverImage: cover("fitness"),
    projectUrl: "",
    githubUrl: "https://github.com/our-org/fitness-tracker",
    status: "In Development",
    projectType: "Mobile App",
    tags: ["Expo", "React Native", "TypeScript"],
    favorite: false,
    notes: "TestFlight build 14 is live. HealthKit sync is still flaky.",
    aiDocumentation: "",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(10),
  },
  {
    title: "AI Prompt Playground",
    description:
      "Experiment bench for comparing prompts and models side by side. Weekend project that stuck around.",
    coverImage: "",
    projectUrl: "https://prompts.example.com",
    githubUrl: "https://github.com/our-org/prompt-playground",
    status: "Completed",
    projectType: "Experiment",
    tags: ["Next.js", "Arena AI"],
    favorite: false,
    notes: "",
    aiDocumentation: [
      "# Prompt Playground — AI context",
      "",
      "Built as an experiment; kept because it is genuinely useful.",
      "",
      "## Rules for changes",
      "- No auth — lives inside the internal network.",
      "- Keep the model adapter layer generic (`src/lib/models.ts`).",
    ].join("\n"),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(30),
  },
  {
    title: "Marketing Landing Page",
    description:
      "One-page marketing site for the product launch. Static export, deployed to a CDN.",
    coverImage: cover("marketing"),
    projectUrl: "https://launch.example.com",
    githubUrl: "https://github.com/our-org/landing",
    status: "Completed",
    projectType: "Landing Page",
    tags: ["Nuxt", "Vue", "Tailwind"],
    favorite: false,
    notes: "",
    aiDocumentation: "",
    createdAt: daysAgo(160),
    updatedAt: daysAgo(75),
  },
  {
    title: "Legacy Admin Tool",
    description:
      "Old jQuery admin panel for managing user accounts. Superseded — kept only for reference.",
    coverImage: "",
    projectUrl: "",
    githubUrl: "https://github.com/our-org/legacy-admin",
    status: "Archived",
    projectType: "Tool",
    tags: ["Express", "MongoDB"],
    favorite: false,
    notes: "Do not deploy. Read-only reference for the data migration.",
    aiDocumentation: "",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(180),
  },
];

export async function seed(uri, force = false) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const collection = client.db().collection("projects");
    const existing = await collection.countDocuments();
    if (existing > 0 && !force) {
      console.log(`Seed skipped — ${existing} project(s) already exist. Use --force to re-seed.`);
      return 0;
    }
    if (force) await collection.deleteMany({});
    const result = await collection.insertMany(demoProjects);
    return result.insertedCount;
  } finally {
    await client.close();
  }
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith("seed.mjs");
if (isDirectRun) {
  loadEnvFile();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env or export it first.");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const count = await seed(uri, force);
  if (count > 0) console.log(`Seeded ${count} demo project(s).`);
}
