# عيادة علاء الدين — Patient Feedback & Referral App

A complete patient feedback funnel for Aladdin Dental Clinic: child/parent info → experience
ratings → referral code → Google Maps review → referral program. Everything is saved straight
into Notion — no Google Forms, no Google Sheets.

**Two Notion databases are already created and live** inside your connected Notion workspace:

- **Aladdin Clinic Feedback** — every submitted review
- **Aladdin Clinic Referrals** — every referral, with staff-controlled reward unlocking

Parent page: https://app.notion.com/p/38fb2d8d5f488163b0c3dfcb520067c1

---

## 1. Project structure

```
aladdin-clinic-app/
├── public/                  ← the web app (served as static files)
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js
│   └── assets/logo.png
├── server/                  ← the backend
│   ├── server.js
│   ├── package.json
│   └── .env.example         ← copy to .env and fill in your secret key
└── README.md                ← this file
```

The backend is Node.js + Express. It serves the frontend *and* exposes two API routes
(`/api/feedback`, `/api/referral`) that write directly to Notion using the official
`@notionhq/client` SDK.

---

## 2. Create your Notion integration (your private "secret key")

The two databases already exist, but they need an *integration* with permission to write to
them — this is your app's own API credential, separate from any other connection.

1. Go to **https://www.notion.so/my-integrations**
2. Click **+ New integration**
3. Name it something like `Aladdin Clinic Feedback App`, pick your workspace, click **Submit**
4. On the next screen, find **Internal Integration Secret** → click **Show** → **Copy**
   This is your `NOTION_TOKEN`. It starts with `ntn_...` — keep it private, never commit it
   to GitHub or share it publicly.

## 3. Share both databases with the integration

An integration can only see pages/databases it's explicitly shared with.

1. Open **Aladdin Clinic Feedback** in Notion
2. Click the **•••** menu (top right) → **Connections** → search for and select your
   integration (`Aladdin Clinic Feedback App`)
3. Repeat the same for **Aladdin Clinic Referrals**

If you skip this step, the app will get a "could not find database" error when it tries to
save data.

## 4. Where to paste the secret key and database IDs

1. In the `server/` folder, copy `.env.example` to a new file named `.env`
2. Paste your integration secret into `NOTION_TOKEN=`
3. The two `NOTION_..._DATA_SOURCE_ID` values are **already filled in** — they point to the
   databases created for you. Leave them as-is unless you've made your own databases instead.

Your `.env` should look like:

```
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_FEEDBACK_DATA_SOURCE_ID=03c92380-2417-4b73-91d8-98146fadb418
NOTION_REFERRALS_DATA_SOURCE_ID=9bd57edd-7e19-4129-bdd1-c4d4e067be7d
PORT=3000
```

**Never commit `.env` to a public repository.** Add it to `.gitignore`.

## 5. Run it locally

```bash
cd server
npm install
npm start
```

Open **http://localhost:3000** — the app is served from the same server that handles the API,
so there's nothing else to configure for local testing.

## 6. Deploy the web app

Because this is a Node.js app (not static-only), deploy it to a host that runs Node servers.
Easiest options:

- **Render** (render.com) — free tier available, connect your GitHub repo, set the root
  directory to `server/`, build command `npm install`, start command `npm start`, and add
  your `.env` values under **Environment**.
- **Railway** (railway.app) — similar flow, very quick for small Node apps.
- **Fly.io** or a basic **VPS** if you want more control.

In all cases: set `NOTION_TOKEN`, `NOTION_FEEDBACK_DATA_SOURCE_ID`, and
`NOTION_REFERRALS_DATA_SOURCE_ID` as environment variables in the host's dashboard (don't
upload your `.env` file itself). Once deployed, you'll get a public URL like
`https://aladdin-clinic.onrender.com` to share with patients (e.g. as a QR code in the clinic).

## 7. Update the Google Maps review link

Open `public/js/app.js` and find this near the top:

```js
const GOOGLE_MAPS_REVIEW_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("عيادة علاء الدين لطب أسنان الاطفال ALADDIN PEDIATRIC DENTAL CLINIC");
```

Replace it with your clinic's actual Google Maps **review link** (Google Business Profile →
"Get more reviews" → copy the short link), e.g.:

```js
const GOOGLE_MAPS_REVIEW_URL = "https://g.page/r/your-real-review-link/review";
```

This is the only line you need to touch to point the "قيّمونا على Google Maps" button at your
real listing.

---

## 8. How staff approve referrals (the reward unlock workflow)

Rewards are never unlocked automatically by the app — only a staff member inside Notion can
unlock them, exactly as specified.

When a referred patient visits the clinic for the first time:

1. Open the **Aladdin Clinic Referrals** database in Notion
2. Find the entry (search by the referred child's name, or by the referral code they mention)
3. Set **Referral Status** to **Completed**
4. Set **Completion Date** to today's date

That's it. Two formula fields update automatically the moment you do this: **Reward Status**
flips from Locked to Unlocked, and **Reward Expiry Date** is automatically set to Completion
Date plus 30 days. You only ever touch Referral Status and Completion Date — everything else
calculates itself. Optionally fill in **Completed By Staff** with your name for your records.

## 9. How staff use a referral code when a new patient visits

1. Ask the new patient's parent if a friend or family member referred them, and if so, ask
   for the code (format ALD-XXXX) or the referrer's name.
2. Open Aladdin Clinic Referrals in Notion, go to the Referral View, and search for that code
   in the Referral Code Used or Referrer Code column to find the matching entry (it was
   created automatically when the original parent filled out the referral form).
3. After the visit is confirmed, follow step 8 above to mark it Completed.
4. To apply the referred family's own discount on their first visit, check Discount
   Percentage (10% by default) on that entry.
5. To check the original referrer's reward, look up their code the same way — their own
   discount unlocks the same way once their referral is marked Completed.

---

## 10. Notion dashboard views (already created for you)

Five views exist as tabs at the top of each database:

- Feedback View (Aladdin Clinic Feedback) — every review, newest first
- Referral View (Aladdin Clinic Referrals) — every referral, all statuses
- Rewards View (Aladdin Clinic Referrals) — only referrals where the reward is Unlocked
- Top Referrers View (Aladdin Clinic Referrals) — grouped by Referrer Code, to see who refers the most
- Expired Rewards View (Aladdin Clinic Referrals) — unlocked rewards sorted by Reward Expiry
  Date ascending; since formulas can't auto-filter "in the past," scan from the top for any
  date before today

---

## 11. Data saved into Notion

Aladdin Clinic Feedback stores: Timestamp (auto), Child Name, Child Age, Area, Parent Phone,
Doctor Name, Reception/Doctor/Team/Child Comfort/Overall Rating (1–5), NPS (0–10), Liked Most,
Needs Improvement, and Referrer Code (auto-generated, format ALD-XXXX, guaranteed unique).

Aladdin Clinic Referrals stores: Referral Code Used, Referrer Code, Referrer Child Name,
Referrer Parent Phone, Referred Child Name, Referred Parent Phone, Relationship, Referral
Status (defaults Pending), Reward Status (formula, defaults Locked), Discount Percentage
(defaults 10%), Reward Expiry Date (formula), Completed By Staff, Completion Date.

---

## 12. Brand & design notes

Colors, type, and layout follow the brief: primary purple #4B2E83, pink #E8A8C9, background
#F2EDF3, dark text #2B1E3F, borders #D9D0DD. Typefaces are El Messiri for headings, echoing
the logo's elegant Arabic lamp/tooth mark, and Cairo for body text and forms — both loaded
from Google Fonts with Arabic support. The logo's flowing ribbon detail reappears as a curved
divider between the thank-you and referral sections, and as a one-time sparkle animation when
the referral code is revealed. The app is mobile-first, fully RTL, with visible keyboard focus
states and reduced-motion support.
