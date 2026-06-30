// =========================================================
// Aladdin Dental Clinic — SELF-CONTAINED server.js
// No public/ folder needed. Works on Render with 2 files only:
//   server.js  +  package.json
// =========================================================
require("dotenv").config();
const express = require("express");
const { Client } = require("@notionhq/client");

const PORT            = process.env.PORT                    || 3000;
const NOTION_TOKEN    = process.env.NOTION_TOKEN            || "";
const FEEDBACK_DB_ID  = process.env.NOTION_FEEDBACK_DB_ID  || "d5ffd4f0-2dba-464d-a61b-cf1a39eee6c2";
const REFERRALS_DB_ID = process.env.NOTION_REFERRALS_DB_ID || "dad7d89c-1cce-4c1a-a2f9-3adf499457b0";

if (!NOTION_TOKEN) console.warn("[WARN] NOTION_TOKEN not set — Notion writes will fail.");

const notion = new Client({ auth: NOTION_TOKEN, notionVersion: "2022-06-28" });
const app    = express();
app.use(express.json());

// =========================================================
// Serve embedded assets
// =========================================================
app.get("/style.css", function(_req, res) {
  res.setHeader("Content-Type", "text/css; charset=utf-8");
  res.send(CSS);
});

app.get("/app.js", function(_req, res) {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.send(FRONTEND_JS);
});

app.get("/", function(_req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(HTML);
});

app.get("/api/health", function(_req, res) {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// =========================================================
// Notion helpers
// =========================================================
function randomCode() {
  return "ALD-" + Math.floor(1000 + Math.random() * 9000);
}

async function codeExists(code) {
  try {
    var r = await notion.databases.query({
      database_id: FEEDBACK_DB_ID,
      filter: { property: "Referrer Code", rich_text: { equals: code } },
      page_size: 1,
    });
    return r.results.length > 0;
  } catch(e) { return false; }
}

async function generateUniqueCode() {
  for (var i = 0; i < 20; i++) {
    var c = randomCode();
    if (!(await codeExists(c))) return c;
  }
  return "ALD-" + Date.now().toString().slice(-4);
}

function mkText(v)  { return { rich_text: [{ type:"text", text:{ content: String(v || "") } }] }; }
function mkTitle(v) { return { title:     [{ type:"text", text:{ content: String(v || "") } }] }; }
function mkNum(v)   { return { number: (v === undefined || v === null || v === "") ? null : Number(v) }; }
function mkPhone(v) { return { phone_number: v ? String(v) : null }; }
function mkSel(v)   { return v ? { select: { name: String(v) } } : { select: null }; }

// =========================================================
// POST /api/feedback
// =========================================================
app.post("/api/feedback", async function(req, res) {
  try {
    var b = req.body || {};
    var required = ["childName","childAge","parentPhone",
      "receptionRating","doctorRating","teamRating","comfortRating","overallRating","nps"];
    for (var i = 0; i < required.length; i++) {
      var f = required[i];
      if (b[f] === undefined || b[f] === null || b[f] === "")
        return res.status(400).json({ error: "Missing: " + f });
    }
    var referrerCode = await generateUniqueCode();
    await notion.pages.create({
      parent: { database_id: FEEDBACK_DB_ID },
      properties: {
        "Child Name":           mkTitle(b.childName),
        "Child Age":            mkNum(b.childAge),
        "Area":                 mkText(b.area),
        "Parent Phone":         mkPhone(b.parentPhone),
        "Doctor Name":          mkText(b.doctorName),
        "Reception Rating":     mkNum(b.receptionRating),
        "Doctor Rating":        mkNum(b.doctorRating),
        "Team Rating":          mkNum(b.teamRating),
        "Child Comfort Rating": mkNum(b.comfortRating),
        "Overall Rating":       mkNum(b.overallRating),
        "NPS":                  mkNum(b.nps),
        "Liked Most":           mkText(b.likedMost),
        "Needs Improvement":    mkText(b.needsImprovement),
        "Referrer Code":        mkText(referrerCode),
      },
    });
    res.json({ referrerCode: referrerCode });
  } catch(err) {
    console.error("POST /api/feedback:", err.body || err.message);
    res.status(500).json({ error: "Notion write failed. Check server logs." });
  }
});

// =========================================================
// POST /api/referral
// =========================================================
app.post("/api/referral", async function(req, res) {
  try {
    var b = req.body || {};
    var req2 = ["referrerCode","referredChildName","referredParentPhone"];
    for (var i = 0; i < req2.length; i++) {
      if (!b[req2[i]]) return res.status(400).json({ error: "Missing: " + req2[i] });
    }
    var entry = (b.referrerChildName || "-") + " to " + b.referredChildName +
                " (" + new Date().toISOString().slice(0,10) + ")";
    await notion.pages.create({
      parent: { database_id: REFERRALS_DB_ID },
      properties: {
        "Referral Entry":        mkTitle(entry),
        "Referral Code Used":    mkText(b.referrerCode),
        "Referrer Code":         mkText(b.referrerCode),
        "Referrer Child Name":   mkText(b.referrerChildName),
        "Referrer Parent Phone": mkPhone(b.referrerParentPhone),
        "Referred Child Name":   mkText(b.referredChildName),
        "Referred Parent Phone": mkPhone(b.referredParentPhone),
        "Relationship":          mkSel(b.relationship),
        "Referral Status":       mkSel("Pending"),
        "Discount Percentage":   mkNum(10),
        "Completed By Staff":    mkText(""),
      },
    });
    res.json({ ok: true });
  } catch(err) {
    console.error("POST /api/referral:", err.body || err.message);
    res.status(500).json({ error: "Notion write failed. Check server logs." });
  }
});

app.get("*", function(_req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(HTML);
});

app.listen(PORT, function() {
  console.log("Aladdin server running on port " + PORT);
});

// =========================================================
// EMBEDDED HTML
// =========================================================
var HTML = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>عيادة علاء الدين لطب أسنان الأطفال | شاركونا رأيكم</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;600;700&family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/style.css"></head><body><div class="bg-veil" aria-hidden="true"></div><header class="site-header"><div style="text-align:center"><div style="font-family:El Messiri,Cairo,sans-serif;font-size:20px;font-weight:700;color:#4B2E83">عيادة علاء الدين</div><div style="font-size:11px;font-weight:600;color:#6B6178;letter-spacing:.06em">ALADDIN DENTAL CLINIC</div></div><div class="progress-track"><span class="pdot active" data-step="1"></span><span class="pdot" data-step="2"></span><span class="pdot" data-step="3"></span></div></header><main class="funnel"><section class="card active" id="step1"><div class="eyebrow">الخطوة ١ من ٣</div><h1 class="card-title">معلومات الطفل</h1><p class="card-sub">عرفونا على نجمكم الصغير قبل أن نبدأ</p><form id="form1" novalidate><div class="field"><label for="childName">اسم الطفل الكامل</label><input type="text" id="childName" autocomplete="off" required><span class="ferr">اسم الطفل مطلوب</span></div><div class="field"><label for="childAge">عمر الطفل</label><input type="number" id="childAge" min="0" max="18" inputmode="numeric" required><span class="ferr">عمر الطفل مطلوب</span></div><div class="field"><label for="parentPhone">رقم هاتف ولي الأمر</label><input type="tel" id="parentPhone" inputmode="tel" placeholder="07xxxxxxxxx" required><span class="ferr">رقم هاتف ولي الأمر مطلوب</span></div><div class="field"><label for="area">المنطقة (اختياري)</label><input type="text" id="area" autocomplete="off"></div><button type="submit" class="btn-primary">التالي</button></form></section><section class="card" id="step2"><div class="eyebrow">الخطوة ٢ من ٣</div><h1 class="card-title">تقييم تجربتكم</h1><p class="card-sub">رأيكم الصادق يساعدنا على تقديم تجربة أفضل</p><form id="form2" novalidate><div class="field"><label for="doctorName">اسم الطبيب (اختياري)</label><input type="text" id="doctorName" autocomplete="off"></div><div class="rating-field" id="rf-receptionRating"><div class="rating-label">كيف تقيمون تجربة الاستقبال؟</div><div class="stars" data-key="receptionRating"></div><span class="ferr">التقييم مطلوب</span></div><div class="rating-field" id="rf-doctorRating"><div class="rating-label">كيف تقيمون تعامل الطبيب مع طفلكم؟</div><div class="stars" data-key="doctorRating"></div><span class="ferr">التقييم مطلوب</span></div><div class="rating-field" id="rf-teamRating"><div class="rating-label">كيف تقيمون تعامل فريق العيادة؟</div><div class="stars" data-key="teamRating"></div><span class="ferr">التقييم مطلوب</span></div><div class="rating-field" id="rf-comfortRating"><div class="rating-label">ما مدى شعور طفلكم بالراحة؟</div><div class="stars" data-key="comfortRating"></div><span class="ferr">التقييم مطلوب</span></div><div class="rating-field" id="rf-overallRating"><div class="rating-label">التقييم العام لتجربتكم</div><div class="stars" data-key="overallRating"></div><span class="ferr">التقييم مطلوب</span></div><div class="nps-wrap" id="nps-wrap"><div class="rating-label">ما مدى احتمالية أن ترشحوا عيادة علاء الدين لأحد أصدقائكم أو أفراد عائلتكم؟</div><div class="nps-grid" id="npsGrid"></div><div class="nps-labels"><span>غير محتمل</span><span>محتمل جداً</span></div><span class="ferr">يرجى اختيار قيمة</span></div><div class="field"><label for="likedMost">ما أكثر شيء أعجبكم؟ (اختياري)</label><textarea id="likedMost" rows="3"></textarea></div><div class="field"><label for="needsImprovement">ما الذي يمكن تحسينه؟ (اختياري)</label><textarea id="needsImprovement" rows="3"></textarea></div><div class="btn-row"><button type="button" class="btn-ghost" id="back1">السابق</button><button type="submit" class="btn-primary" id="submitFeedback"><span class="lbl">إرسال التقييم</span><span class="spin" hidden></span></button></div><p class="form-err" id="feedbackErr" hidden></p></form></section><section class="card" id="step3"><div class="ty-block"><div class="sparkles"><span></span><span></span><span></span><span></span><span></span><span></span></div><h1 class="card-title">شكراً لتقييمكم</h1><p class="card-sub">رأيكم يساعدنا دائماً على تقديم تجربة أفضل لأطفالنا داخل عيادة علاء الدين.</p><div class="code-card"><p class="code-label">كود الإحالة الخاص بكم</p><div class="code-display" id="codeDisplay">ALD-0000</div><button class="btn-copy" id="copyBtn" type="button">نسخ الكود</button><p class="code-note">شاركوا هذا الكود مع الأصدقاء والعائلة وعند زيارتهم للعيادة تحصلون على خصم 10%.</p></div><a href="#" target="_blank" rel="noopener" class="btn-maps" id="mapsBtn">قيمونا على Google Maps</a></div><div class="ribbon-divider"><svg viewBox="0 0 600 30" preserveAspectRatio="none"><path d="M0,15 C150,30 300,0 450,14 C520,22 560,24 600,10"/></svg></div><div class="referral-section"><h2 class="card-title" style="font-size:21px">برنامج الإحالة والمكافآت</h2><p class="card-sub">رشحوا صديقاً أو أحد أفراد العائلة وإذا زار العيادة عن طريقكم ستحصلون على خصم 10%.</p><form id="form3" novalidate><div class="field"><label for="referredChild">اسم الطفل المحال</label><input type="text" id="referredChild" autocomplete="off" required><span class="ferr">هذا الحقل مطلوب</span></div><div class="field"><label for="referredPhone">رقم هاتف ولي أمره</label><input type="tel" id="referredPhone" inputmode="tel" placeholder="07xxxxxxxxx" required><span class="ferr">هذا الحقل مطلوب</span></div><div class="field"><label for="relationship">صلة القرابة (اختياري)</label><select id="relationship"><option value="">اختر</option><option>صديق</option><option>قريب</option><option>جار</option><option>زميل</option><option>أخرى</option></select></div><button type="submit" class="btn-primary" id="submitReferral"><span class="lbl">تسجيل الإحالة</span><span class="spin" hidden></span></button><p class="form-err" id="referralErr" hidden></p></form><div class="referral-ok" id="referralOk" hidden><p class="ok-title">تم تسجيل الإحالة بنجاح</p><p class="ok-sub">سيتم تفعيل الخصم الخاص بكم بعد زيارة الشخص المحال للعيادة.</p></div></div></section></main><footer class="site-footer">عيادة علاء الدين لطب أسنان الأطفال · ALADDIN PEDIATRIC DENTAL CLINIC</footer><script src="/app.js"></script></body></html>';

// =========================================================
// EMBEDDED CSS
// =========================================================
var CSS = ':root{--p:#4B2E83;--pd:#38205F;--ps:#6B4AA8;--pink:#E8A8C9;--bg:#F2EDF3;--text:#2B1E3F;--muted:#6B6178;--border:#D9D0DD;--gold:#D9A441;--green:#3F8F5F;--gbg:#E8F4EC;--red:#C0506A;--card-shadow:0 16px 48px -18px rgba(75,46,131,.26),0 3px 12px -5px rgba(75,46,131,.1);--ease:cubic-bezier(.22,1,.36,1);--r-lg:26px;--r-md:18px;--r-sm:12px;--pill:999px}*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;min-height:100vh;font-family:Cairo,sans-serif;background:var(--bg);color:var(--text);direction:rtl;overflow-x:hidden}.bg-veil{position:fixed;inset:0;z-index:-1;background:radial-gradient(500px 400px at 85% -5%,rgba(232,168,201,.45),transparent 60%),radial-gradient(600px 500px at -10% 110%,rgba(75,46,131,.13),transparent 60%),var(--bg)}.site-header{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 20px 8px}.progress-track{display:flex;gap:7px}.pdot{width:8px;height:8px;border-radius:50%;background:var(--border);transition:all .4s var(--ease)}.pdot.active{width:22px;border-radius:var(--pill);background:var(--p)}.pdot.done{background:var(--pink)}.funnel{max-width:560px;margin:0 auto;padding:8px 16px 60px}.card{display:none;background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--card-shadow);padding:30px 24px 28px;margin-top:16px;animation:cardIn .5s var(--ease)}.card.active{display:block}@keyframes cardIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}.eyebrow{font-size:12.5px;font-weight:700;color:var(--ps);margin-bottom:5px}.card-title{font-family:"El Messiri",Cairo,sans-serif;font-weight:700;font-size:25px;line-height:1.3;margin:0 0 7px;color:var(--pd)}.card-sub{font-size:14.5px;color:var(--muted);margin:0 0 24px;line-height:1.7}.field{margin-bottom:18px}.field label,.rating-label{display:block;font-weight:600;font-size:14.5px;margin-bottom:8px;color:var(--text);line-height:1.55}input[type=text],input[type=tel],input[type=number],textarea,select{width:100%;font-family:Cairo,sans-serif;font-size:15px;padding:12px 14px;border-radius:var(--r-sm);border:1.5px solid var(--border);background:#FCFAFD;color:var(--text);transition:border-color .18s,box-shadow .18s}textarea{resize:vertical;min-height:78px}input:focus,textarea:focus,select:focus{outline:none;border-color:var(--p);background:#fff;box-shadow:0 0 0 4px rgba(75,46,131,.1)}.has-err input,.has-err textarea,.has-err .stars,.has-err .nps-grid{border-color:var(--red)}.ferr{display:none;color:var(--red);font-size:12.5px;margin-top:5px;font-weight:600}.has-err>.ferr,.has-err .ferr{display:block}.rating-field{margin-bottom:20px}.stars{display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:5px;padding:6px 3px;border-radius:var(--r-sm)}.star{background:none;border:none;cursor:pointer;font-size:28px;line-height:1;padding:3px;color:var(--border);transition:transform .13s,color .13s}.star:hover{transform:scale(1.1)}.star.on{color:var(--gold)}.nps-wrap{margin-bottom:20px}.nps-grid{display:grid;grid-template-columns:repeat(11,1fr);gap:4px}.nps-btn{aspect-ratio:1;border-radius:9px;border:1.5px solid var(--border);background:#FCFAFD;font-family:Cairo,sans-serif;font-weight:700;font-size:12.5px;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .13s}.nps-btn:hover{border-color:var(--ps)}.nps-btn.on{background:var(--p);border-color:var(--p);color:#fff;transform:translateY(-2px)}.nps-labels{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-top:6px}@media(max-width:400px){.nps-grid{grid-template-columns:repeat(6,1fr)}}.btn-primary{width:100%;border:none;background:linear-gradient(135deg,var(--p),var(--pd));color:#fff;font-family:Cairo,sans-serif;font-weight:700;font-size:15.5px;padding:14px 20px;border-radius:var(--pill);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;box-shadow:0 6px 22px -10px rgba(75,46,131,.4);transition:transform .14s,box-shadow .14s,opacity .14s}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 28px -10px rgba(75,46,131,.45)}.btn-primary:active{transform:translateY(0)}.btn-primary:disabled{opacity:.6;cursor:not-allowed;transform:none}.btn-ghost{background:none;border:1.5px solid var(--border);color:var(--muted);font-family:Cairo,sans-serif;font-weight:600;font-size:14.5px;padding:14px 20px;border-radius:var(--pill);cursor:pointer;transition:all .13s;flex:0 0 auto}.btn-ghost:hover{border-color:var(--ps);color:var(--p)}.btn-row{display:flex;gap:9px}.btn-row .btn-primary{flex:1}.spin{width:15px;height:15px;border-radius:50%;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin .65s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}.form-err{color:var(--red);font-size:13px;font-weight:600;margin-top:10px;text-align:center;padding:9px 14px;background:#fff0f3;border-radius:var(--r-sm)}.ty-block{text-align:center}.sparkles{position:relative;height:44px;margin-bottom:2px}.sparkles span{position:absolute;top:50%;left:50%;width:9px;height:9px;clip-path:polygon(50% 0%,61% 38%,100% 50%,61% 62%,50% 100%,39% 62%,0% 50%,39% 38%);background:var(--gold);opacity:0;animation:spk 1.5s var(--ease) forwards}.sparkles span:nth-child(1){animation-delay:.05s;background:var(--gold)}.sparkles span:nth-child(2){animation-delay:.18s;background:var(--pink)}.sparkles span:nth-child(3){animation-delay:.32s;background:var(--p)}.sparkles span:nth-child(4){animation-delay:.12s;background:var(--gold)}.sparkles span:nth-child(5){animation-delay:.42s;background:var(--pink)}.sparkles span:nth-child(6){animation-delay:.52s;background:var(--ps)}@keyframes spk{0%{opacity:0}30%{opacity:1}100%{opacity:0}}.code-card{margin:22px 0 20px;padding:22px 18px;border-radius:var(--r-md);background:linear-gradient(155deg,#fbf4f8,#f4ecf9);border:1.5px dashed var(--pink)}.code-label{font-size:12.5px;font-weight:700;color:var(--ps);margin:0 0 9px}.code-display{font-family:"El Messiri",Cairo,sans-serif;font-size:36px;font-weight:700;letter-spacing:.07em;color:var(--pd);direction:ltr;margin-bottom:13px}.btn-copy{background:#fff;border:1.5px solid var(--ps);color:var(--p);font-family:Cairo,sans-serif;font-weight:700;font-size:13px;padding:8px 18px;border-radius:var(--pill);cursor:pointer;transition:all .13s}.btn-copy:hover{background:var(--p);color:#fff;border-color:var(--p)}.btn-copy.copied{background:var(--green);border-color:var(--green);color:#fff}.code-note{font-size:13px;color:var(--muted);line-height:1.65;margin:13px 0 0}.btn-maps{display:inline-flex;align-items:center;gap:7px;text-decoration:none;background:#fff;border:1.5px solid var(--border);color:var(--pd);font-weight:700;font-size:14.5px;padding:12px 22px;border-radius:var(--pill);transition:all .13s;margin-top:6px}.btn-maps:hover{border-color:var(--p);transform:translateY(-2px)}.ribbon-divider{margin:30px -4px 16px}.ribbon-divider svg{width:100%;height:22px}.ribbon-divider path{fill:none;stroke:var(--pink);stroke-width:2.5;stroke-linecap:round}.referral-section{margin-top:4px}.referral-ok{text-align:center;padding:20px;border-radius:var(--r-md);background:var(--gbg);margin-top:4px}.ok-title{font-weight:700;color:var(--green);font-size:16px;margin:0 0 5px}.ok-sub{font-size:13.5px;color:var(--muted);margin:0;line-height:1.6}.site-footer{text-align:center;font-size:12px;color:var(--muted);padding:8px 20px 40px}@media(max-width:380px){.card{padding:24px 16px 22px}.card-title{font-size:21px}.code-display{font-size:30px}.star{font-size:24px}}';

// =========================================================
// EMBEDDED FRONTEND JS (no template literals — plain ES5)
// =========================================================
var FRONTEND_JS = 'var MAPS_URL="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("ALADDIN PEDIATRIC DENTAL CLINIC");var ratings={receptionRating:0,doctorRating:0,teamRating:0,comfortRating:0,overallRating:0};var npsVal=null,referrerCode=null;function gid(id){return document.getElementById(id);}function qs(s,c){return(c||document).querySelector(s);}function qsa(s,c){return Array.from((c||document).querySelectorAll(s));}function validPhone(v){return v&&v.replace(/\\D/g,"").length>=9;}function setErr(el,show){if(el)el.classList.toggle("has-err",show);}function updateDots(step){qsa(".pdot").forEach(function(d){var s=+d.dataset.step;d.classList.toggle("active",s===step);d.classList.toggle("done",s<step);});}function triggerSparkle(){qsa(".sparkles span").forEach(function(s){s.style.animation="none";void s.offsetWidth;s.style.animation="";});}function goTo(step){qsa(".card").forEach(function(c){c.classList.remove("active");});var t=gid("step"+step);if(t)t.classList.add("active");updateDots(step);window.scrollTo({top:0,behavior:"smooth"});if(step===3)triggerSparkle();}qsa(".stars").forEach(function(container){var key=container.dataset.key;for(var i=1;i<=5;i++){(function(val){var btn=document.createElement("button");btn.type="button";btn.className="star";btn.textContent="\\u2605";btn.dataset.val=val;btn.addEventListener("click",function(){ratings[key]=val;qsa(".star",container).forEach(function(s){s.classList.toggle("on",+s.dataset.val<=val);});var rf=container.closest(".rating-field");if(rf)rf.classList.remove("has-err");});container.appendChild(btn);})(i);}});var npsGrid=gid("npsGrid");for(var ni=0;ni<=10;ni++){(function(val){var btn=document.createElement("button");btn.type="button";btn.className="nps-btn";btn.textContent=val;btn.addEventListener("click",function(){npsVal=val;qsa(".nps-btn",npsGrid).forEach(function(b){b.classList.toggle("on",+b.textContent===val);});var nw=gid("nps-wrap");if(nw)nw.classList.remove("has-err");});npsGrid.appendChild(btn);})(ni);}gid("form1").addEventListener("submit",function(e){e.preventDefault();var ok=true;var cn=gid("childName");if(!cn.value.trim()){setErr(cn.closest(".field"),true);ok=false;}else setErr(cn.closest(".field"),false);var ca=gid("childAge");if(!ca.value){setErr(ca.closest(".field"),true);ok=false;}else setErr(ca.closest(".field"),false);var pp=gid("parentPhone");if(!validPhone(pp.value)){setErr(pp.closest(".field"),true);ok=false;}else setErr(pp.closest(".field"),false);if(ok)goTo(2);});gid("back1").addEventListener("click",function(){goTo(1);});gid("form2").addEventListener("submit",function(e){e.preventDefault();var ok=true;["receptionRating","doctorRating","teamRating","comfortRating","overallRating"].forEach(function(key){var rf=gid("rf-"+key);if(!ratings[key]){if(rf)rf.classList.add("has-err");ok=false;}else{if(rf)rf.classList.remove("has-err");}});var nw=gid("nps-wrap");if(npsVal===null){if(nw)nw.classList.add("has-err");ok=false;}else{if(nw)nw.classList.remove("has-err");}if(!ok){var fe=document.querySelector(".has-err");if(fe)fe.scrollIntoView({behavior:"smooth",block:"center"});return;}var payload={childName:gid("childName").value.trim(),childAge:Number(gid("childAge").value),area:gid("area").value.trim(),parentPhone:gid("parentPhone").value.trim(),doctorName:gid("doctorName").value.trim(),receptionRating:ratings.receptionRating,doctorRating:ratings.doctorRating,teamRating:ratings.teamRating,comfortRating:ratings.comfortRating,overallRating:ratings.overallRating,nps:npsVal,likedMost:gid("likedMost").value.trim(),needsImprovement:gid("needsImprovement").value.trim()};var btn=gid("submitFeedback"),errEl=gid("feedbackErr"),lbl=qs(".lbl",btn),sp=qs(".spin",btn);errEl.hidden=true;btn.disabled=true;lbl.textContent="\\u062C\\u0627\\u0631\\u0650 \\u0627\\u0644\\u0625\\u0631\\u0633\\u0627\\u0644...";sp.hidden=false;fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d};});}).then(function(res){if(!res.ok)throw new Error(res.data.error||"Error");referrerCode=res.data.referrerCode;gid("codeDisplay").textContent=referrerCode;gid("mapsBtn").href=MAPS_URL;goTo(3);}).catch(function(err){errEl.textContent="\\u062A\\u0639\\u0630\\u0651\\u0631 \\u0625\\u0631\\u0633\\u0627\\u0644 \\u0627\\u0644\\u062A\\u0642\\u064A\\u064A\\u0645 \\u2014 \\u064A\\u0631\\u062C\\u0649 \\u0627\\u0644\\u0645\\u062D\\u0627\\u0648\\u0644\\u0629 ("+err.message+")";errEl.hidden=false;}).finally(function(){btn.disabled=false;lbl.textContent="\\u0625\\u0631\\u0633\\u0627\\u0644 \\u0627\\u0644\\u062A\\u0642\\u064A\\u064A\\u0645";sp.hidden=true;});});gid("copyBtn").addEventListener("click",function(){var code=gid("codeDisplay").textContent;if(navigator.clipboard){navigator.clipboard.writeText(code).then(function(){gid("copyBtn").textContent="\\u2713 \\u062A\\u0645 \\u0627\\u0644\\u0646\\u0633\\u062E";gid("copyBtn").classList.add("copied");setTimeout(function(){gid("copyBtn").textContent="\\u0646\\u0633\\u062E \\u0627\\u0644\\u0643\\u0648\\u062F";gid("copyBtn").classList.remove("copied");},2200);}).catch(function(){});}});gid("form3").addEventListener("submit",function(e){e.preventDefault();var ok=true;var rc=gid("referredChild");if(!rc.value.trim()){setErr(rc.closest(".field"),true);ok=false;}else setErr(rc.closest(".field"),false);var rp=gid("referredPhone");if(!validPhone(rp.value)){setErr(rp.closest(".field"),true);ok=false;}else setErr(rp.closest(".field"),false);if(!ok)return;var payload={referrerCode:referrerCode,referrerChildName:gid("childName").value.trim(),referrerParentPhone:gid("parentPhone").value.trim(),referredChildName:rc.value.trim(),referredParentPhone:rp.value.trim(),relationship:gid("relationship").value};var btn=gid("submitReferral"),errEl=gid("referralErr"),lbl=qs(".lbl",btn),sp=qs(".spin",btn);errEl.hidden=true;btn.disabled=true;lbl.textContent="\\u062C\\u0627\\u0631\\u0650 \\u0627\\u0644\\u062A\\u0633\\u062C\\u064A\\u0644...";sp.hidden=false;fetch("/api/referral",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d};});}).then(function(res){if(!res.ok)throw new Error(res.data.error||"Error");gid("form3").hidden=true;gid("referralOk").hidden=false;}).catch(function(err){errEl.textContent="\\u062A\\u0639\\u0630\\u0651\\u0631 \\u0627\\u0644\\u062A\\u0633\\u062C\\u064A\\u0644 ("+err.message+")";errEl.hidden=false;}).finally(function(){btn.disabled=false;lbl.textContent="\\u062A\\u0633\\u062C\\u064A\\u0644 \\u0627\\u0644\\u0625\\u062D\\u0627\\u0644\\u0629";sp.hidden=true;});});goTo(1);';
