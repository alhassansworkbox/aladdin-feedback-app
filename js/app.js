// =========================================================
// Aladdin Dental Clinic — Feedback Funnel
// =========================================================

// ---- CONFIG ----
// Update this with the clinic's real Google Maps review link.
// Placeholder uses a Maps search for the clinic name as requested in the brief.
const GOOGLE_MAPS_REVIEW_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("عيادة علاء الدين لطب أسنان الاطفال ALADDIN PEDIATRIC DENTAL CLINIC");

const API_BASE = ""; // same-origin; backend serves this file too

// =========================================================
// State
// =========================================================
const state = {
  step: 1,
  ratings: {
    receptionRating: 0,
    doctorRating: 0,
    teamRating: 0,
    comfortRating: 0,
    overallRating: 0,
  },
  nps: null,
  referrerCode: null,
};

// =========================================================
// Helpers
// =========================================================
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $all(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

function setFieldError(fieldEl, show) {
  fieldEl.classList.toggle("has-error", show);
}

function isValidPhone(value) {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 9; // lenient — supports 07XXXXXXXXX and +964 formats
}

// =========================================================
// Step navigation
// =========================================================
function goToStep(n) {
  state.step = n;
  $all(".step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === n);
  });
  $all(".progress-dot").forEach((dot) => {
    const s = Number(dot.dataset.step);
    dot.classList.toggle("is-active", s === n);
    dot.classList.toggle("is-done", s < n);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (n === 3) triggerSparkle();
}

function triggerSparkle() {
  const stage = $(".sparkle-stage");
  if (!stage) return;
  $all(".spark", stage).forEach((s) => {
    s.style.animation = "none";
    // force reflow to restart animation
    void s.offsetWidth;
    s.style.animation = "";
  });
}

// =========================================================
// Star rating widgets
// =========================================================
function buildStarWidgets() {
  $all(".rating-field").forEach((fieldset) => {
    const key = fieldset.dataset.rating;
    const container = $(".stars", fieldset);
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star-btn";
      btn.dataset.value = i;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.setAttribute("aria-label", `${i} من ٥`);
      btn.textContent = "★";
      btn.addEventListener("click", () => setRating(key, i, fieldset));
      container.appendChild(btn);
    }
  });
}

function setRating(key, value, fieldset) {
  state.ratings[key] = value;
  const stars = $all(".star-btn", fieldset);
  stars.forEach((s) => {
    const filled = Number(s.dataset.value) <= value;
    s.classList.toggle("is-filled", filled);
    s.setAttribute("aria-checked", filled ? "true" : "false");
  });
  setFieldError(fieldset, false);
}

// =========================================================
// NPS scale
// =========================================================
function buildNpsWidget() {
  const wrap = $("#npsButtons");
  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nps-btn";
    btn.dataset.value = i;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.textContent = i;
    btn.addEventListener("click", () => setNps(i));
    wrap.appendChild(btn);
  }
}

function setNps(value) {
  state.nps = value;
  $all(".nps-btn").forEach((b) => {
    const sel = Number(b.dataset.value) === value;
    b.classList.toggle("is-selected", sel);
    b.setAttribute("aria-checked", sel ? "true" : "false");
  });
  setFieldError($(".nps-field"), false);
}

// =========================================================
// STEP 1 — child info
// =========================================================
$("#form-step-1").addEventListener("submit", (e) => {
  e.preventDefault();
  let valid = true;

  const childName = $("#childName");
  const childAge = $("#childAge");
  const parentPhone = $("#parentPhone");

  if (!childName.value.trim()) { setFieldError(childName.closest(".field"), true); valid = false; }
  else setFieldError(childName.closest(".field"), false);

  if (!childAge.value) { setFieldError(childAge.closest(".field"), true); valid = false; }
  else setFieldError(childAge.closest(".field"), false);

  if (!parentPhone.value.trim() || !isValidPhone(parentPhone.value)) {
    setFieldError(parentPhone.closest(".field"), true); valid = false;
  } else setFieldError(parentPhone.closest(".field"), false);

  if (!valid) return;
  goToStep(2);
});

$("#backTo1").addEventListener("click", () => goToStep(1));

// =========================================================
// STEP 2 — experience ratings + submit feedback
// =========================================================
$("#form-step-2").addEventListener("submit", async (e) => {
  e.preventDefault();
  let valid = true;

  $all(".rating-field").forEach((fieldset) => {
    const key = fieldset.dataset.rating;
    if (!state.ratings[key]) { setFieldError(fieldset, true); valid = false; }
    else setFieldError(fieldset, false);
  });

  const npsField = $(".nps-field");
  if (state.nps === null) { setFieldError(npsField, true); valid = false; }
  else setFieldError(npsField, false);

  if (!valid) {
    $(".has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const payload = {
    childName: $("#childName").value.trim(),
    childAge: Number($("#childAge").value),
    area: $("#area").value.trim(),
    parentPhone: $("#parentPhone").value.trim(),
    doctorName: $("#doctorName").value.trim(),
    receptionRating: state.ratings.receptionRating,
    doctorRating: state.ratings.doctorRating,
    teamRating: state.ratings.teamRating,
    comfortRating: state.ratings.comfortRating,
    overallRating: state.ratings.overallRating,
    nps: state.nps,
    likedMost: $("#likedMost").value.trim(),
    needsImprovement: $("#needsImprovement").value.trim(),
  };

  const submitBtn = $("#submitStep2");
  const errorEl = $("#submitError");
  errorEl.classList.remove("is-visible");
  submitBtn.classList.add("is-loading");
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("submit failed");
    const data = await res.json();
    state.referrerCode = data.referrerCode;
    $("#referralCodeDisplay").textContent = state.referrerCode;
    $("#mapsBtn").href = GOOGLE_MAPS_REVIEW_URL;
    goToStep(3);
  } catch (err) {
    errorEl.classList.add("is-visible");
  } finally {
    submitBtn.classList.remove("is-loading");
    submitBtn.disabled = false;
  }
});

// =========================================================
// STEP 3 — copy referral code
// =========================================================
$("#copyCodeBtn").addEventListener("click", async () => {
  const btn = $("#copyCodeBtn");
  try {
    await navigator.clipboard.writeText(state.referrerCode || $("#referralCodeDisplay").textContent);
    btn.textContent = "تم النسخ ✓";
    btn.classList.add("is-copied");
    setTimeout(() => {
      btn.textContent = "نسخ الكود";
      btn.classList.remove("is-copied");
    }, 2000);
  } catch (err) {
    // clipboard unavailable — silently ignore
  }
});

// =========================================================
// STEP 3 — referral form
// =========================================================
$("#form-referral").addEventListener("submit", async (e) => {
  e.preventDefault();
  let valid = true;

  const referredChildName = $("#referredChildName");
  const referredParentPhone = $("#referredParentPhone");

  if (!referredChildName.value.trim()) { setFieldError(referredChildName.closest(".field"), true); valid = false; }
  else setFieldError(referredChildName.closest(".field"), false);

  if (!referredParentPhone.value.trim() || !isValidPhone(referredParentPhone.value)) {
    setFieldError(referredParentPhone.closest(".field"), true); valid = false;
  } else setFieldError(referredParentPhone.closest(".field"), false);

  if (!valid) return;

  const payload = {
    referrerCode: state.referrerCode,
    referrerChildName: $("#childName").value.trim(),
    referrerParentPhone: $("#parentPhone").value.trim(),
    referredChildName: referredChildName.value.trim(),
    referredParentPhone: referredParentPhone.value.trim(),
    relationship: $("#relationship").value,
  };

  const submitBtn = $("#submitReferral");
  const errorEl = $("#referralError");
  errorEl.classList.remove("is-visible");
  submitBtn.classList.add("is-loading");
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/referral`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("submit failed");

    $("#form-referral").hidden = true;
    $("#referralSuccess").hidden = false;
  } catch (err) {
    errorEl.classList.add("is-visible");
  } finally {
    submitBtn.classList.remove("is-loading");
    submitBtn.disabled = false;
  }
});

// =========================================================
// Init
// =========================================================
buildStarWidgets();
buildNpsWidget();
goToStep(1);
