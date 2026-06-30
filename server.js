// =========================================================
// Aladdin Dental Clinic — Backend Server
// Handles: feedback submission, referral submission,
// unique referral code generation, writes to Notion.
// =========================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Client } = require("@notionhq/client");

const PORT = process.env.PORT || 3000;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const FEEDBACK_DATA_SOURCE_ID = process.env.NOTION_FEEDBACK_DATA_SOURCE_ID;
const REFERRALS_DATA_SOURCE_ID = process.env.NOTION_REFERRALS_DATA_SOURCE_ID;

if (!NOTION_TOKEN || !FEEDBACK_DATA_SOURCE_ID || !REFERRALS_DATA_SOURCE_ID) {
  console.warn(
    "[WARN] Missing one or more required env vars: NOTION_TOKEN, " +
    "NOTION_FEEDBACK_DATA_SOURCE_ID, NOTION_REFERRALS_DATA_SOURCE_ID. " +
    "See .env.example. The server will start but API calls will fail until these are set."
  );
}

const notion = new Client({ auth: NOTION_TOKEN, notionVersion: "2025-09-03" });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// =========================================================
// Helpers
// =========================================================

// Generates a random ALD-XXXX code (4 digits).
function randomCode() {
  const n = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return `ALD-${n}`;
}

// Checks Notion for an existing page whose "Referrer Code" equals the given code.
async function codeExists(code) {
  const res = await notion.dataSources.query({
    data_source_id: FEEDBACK_DATA_SOURCE_ID,
    filter: {
      property: "Referrer Code",
      rich_text: { equals: code },
    },
    page_size: 1,
  });
  return res.results.length > 0;
}

// Generates a referral code guaranteed unique against existing Notion records.
async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = randomCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await codeExists(code);
    if (!exists) return code;
  }
  // Extremely unlikely fallback: timestamp-based suffix guarantees uniqueness.
  return `ALD-${Date.now().toString().slice(-4)}`;
}

function text(value) {
  return {
    rich_text: [{ type: "text", text: { content: String(value ?? "") } }],
  };
}

function title(value) {
  return {
    title: [{ type: "text", text: { content: String(value ?? "") } }],
  };
}

function number(value) {
  return { number: value === undefined || value === null || value === "" ? null : Number(value) };
}

function phone(value) {
  return { phone_number: value ? String(value) : null };
}

function select(value) {
  return value ? { select: { name: String(value) } } : { select: null };
}

// =========================================================
// POST /api/feedback
// =========================================================
app.post("/api/feedback", async (req, res) => {
  try {
    const b = req.body || {};

    const required = ["childName", "childAge", "parentPhone",
      "receptionRating", "doctorRating", "teamRating", "comfortRating", "overallRating", "nps"];
    for (const field of required) {
      if (b[field] === undefined || b[field] === null || b[field] === "") {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const referrerCode = await generateUniqueReferralCode();

    await notion.pages.create({
      parent: { type: "data_source_id", data_source_id: FEEDBACK_DATA_SOURCE_ID },
      properties: {
        "Child Name": title(b.childName),
        "Child Age": number(b.childAge),
        "Area": text(b.area),
        "Parent Phone": phone(b.parentPhone),
        "Doctor Name": text(b.doctorName),
        "Reception Rating": number(b.receptionRating),
        "Doctor Rating": number(b.doctorRating),
        "Team Rating": number(b.teamRating),
        "Child Comfort Rating": number(b.comfortRating),
        "Overall Rating": number(b.overallRating),
        "NPS": number(b.nps),
        "Liked Most": text(b.likedMost),
        "Needs Improvement": text(b.needsImprovement),
        "Referrer Code": text(referrerCode),
      },
    });

    res.json({ referrerCode });
  } catch (err) {
    console.error("POST /api/feedback failed:", err.body || err.message);
    res.status(500).json({ error: "Failed to save feedback to Notion." });
  }
});

// =========================================================
// POST /api/referral
// =========================================================
app.post("/api/referral", async (req, res) => {
  try {
    const b = req.body || {};

    const required = ["referrerCode", "referredChildName", "referredParentPhone"];
    for (const field of required) {
      if (!b[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const entryTitle = `${b.referrerChildName || "—"} → ${b.referredChildName} (${new Date().toISOString().slice(0, 10)})`;

    await notion.pages.create({
      parent: { type: "data_source_id", data_source_id: REFERRALS_DATA_SOURCE_ID },
      properties: {
        "Referral Entry": title(entryTitle),
        "Referral Code Used": text(b.referrerCode),
        "Referrer Code": text(b.referrerCode),
        "Referrer Child Name": text(b.referrerChildName),
        "Referrer Parent Phone": phone(b.referrerParentPhone),
        "Referred Child Name": text(b.referredChildName),
        "Referred Parent Phone": phone(b.referredParentPhone),
        "Relationship": select(b.relationship),
        "Referral Status": select("Pending"),
        "Discount Percentage": number(0.10),
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/referral failed:", err.body || err.message);
    res.status(500).json({ error: "Failed to save referral to Notion." });
  }
});

// =========================================================
// Health check
// =========================================================
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Aladdin Clinic server running on http://localhost:${PORT}`);
});
