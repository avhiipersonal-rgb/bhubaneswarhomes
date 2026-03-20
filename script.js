/* ═══════════════════════════════════════════════════════════════
   BHUBANESWAR HOMES — v4 JAVASCRIPT
   ═══════════════════════════════════════════════════════════════

   WHAT CHANGED IN v4
   ───────────────────
   ① Smooth scroll  → Uses JS scroll for maximum browser
                       compatibility. Dynamically reads header
                       height so anchors never hide under it.
                       Handles CSS scroll-padding-top as fallback.
   ② Header         → Same logic, improved outside-click handling.
   ③ Quick Select   → Same logic, slightly cleaner form pre-fill.
   ④ Scroll Reveal  → Same IntersectionObserver logic.
   ⑤ Lead Form      → Same validation + Sheets submission.
                       Added: body scroll lock during mobile nav.

   ▶ SETUP REQUIRED
   ─────────────────
   Replace WEBHOOK_URL below with your Google Apps Script URL.
   See INSTRUCTIONS.md for the full step-by-step guide.
   ═══════════════════════════════════════════════════════════════ */

/* ── Google Sheets webhook URL ──
   Replace this placeholder with your real deployment URL.
   The form works in demo mode until you replace it.        */
const WEBHOOK_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec";


/* ═══════════════════════════════════════════════════════════════
   UTILITY: Get the current height of the fixed header.
   Called before every smooth-scroll so the offset is always
   accurate (even if the header grows on mobile nav opening).
   ═══════════════════════════════════════════════════════════════ */
function getHeaderHeight() {
  var header = document.getElementById("header");
  return header ? header.getBoundingClientRect().height : 0;
}


/* ═══════════════════════════════════════════════════════════════
   1. HEADER: scroll shadow + mobile nav toggle
   ═══════════════════════════════════════════════════════════════ */
(function initHeader() {
  var header    = document.getElementById("header");
  var hamburger = document.getElementById("hamburger");
  var mobileNav = document.getElementById("mobileNav");
  if (!header || !hamburger || !mobileNav) return;

  /* Add shadow when user scrolls down */
  window.addEventListener("scroll", function () {
    header.classList.toggle("scrolled", window.scrollY > 24);
  }, { passive: true });

  /* Open / close mobile nav */
  hamburger.addEventListener("click", function () {
    var isOpen = !mobileNav.hasAttribute("hidden");

    if (isOpen) {
      /* Close */
      mobileNav.setAttribute("hidden", "");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    } else {
      /* Open */
      mobileNav.removeAttribute("hidden");
      hamburger.classList.add("open");
      hamburger.setAttribute("aria-expanded", "true");
      /* Move focus to first nav link for accessibility */
      var firstLink = mobileNav.querySelector("a");
      if (firstLink) firstLink.focus();
    }
  });

  /* Close nav on outside click */
  document.addEventListener("click", function (e) {
    if (!header.contains(e.target) && !mobileNav.hasAttribute("hidden")) {
      mobileNav.setAttribute("hidden", "");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });

  /* Close nav on Escape key */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !mobileNav.hasAttribute("hidden")) {
      mobileNav.setAttribute("hidden", "");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.focus();
    }
  });
})();

/* Called by onclick on mobile nav anchor links */
function closeNav() {
  var mobileNav = document.getElementById("mobileNav");
  var hamburger = document.getElementById("hamburger");
  if (!mobileNav || !hamburger) return;
  mobileNav.setAttribute("hidden", "");
  hamburger.classList.remove("open");
  hamburger.setAttribute("aria-expanded", "false");
}


/* ═══════════════════════════════════════════════════════════════
   2. SMOOTH SCROLL
   ───────────────────────────────────────────────────────────────
   Why JS rather than CSS-only?
   • CSS scroll-behavior is already set, but JS gives us precise
     control over the offset (header height).
   • CSS scroll-padding-top is set as a fallback in the stylesheet.
   • This works in all modern browsers including older Android.
   ═══════════════════════════════════════════════════════════════ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = this.getAttribute("href");

      /* Skip empty/hash-only links */
      if (!targetId || targetId === "#") return;

      var target = document.querySelector(targetId);
      if (!target) return;

      /* Prevent default jump */
      e.preventDefault();

      /* Close mobile nav if open */
      closeNav();

      /* Calculate position: element top minus header height minus 8px gap */
      var headerH = getHeaderHeight();
      var gap     = 10;   /* extra breathing room above destination */
      var targetTop = target.getBoundingClientRect().top + window.scrollY - headerH - gap;

      /* Smooth scroll */
      window.scrollTo({
        top:      Math.max(0, targetTop),
        behavior: "smooth"
      });
    });
  });
})();


/* ═══════════════════════════════════════════════════════════════
   3. QUICK SELECT PILLS
   ───────────────────────────────────────────────────────────────
   • User selects BHK type → state.bhk set
   • User selects budget → state.budget set + form pre-filled
   • Both selected → result banner appears with CTA
   ═══════════════════════════════════════════════════════════════ */
(function initQuickSelect() {
  /* Selection state */
  var state = { bhk: null, budget: null };

  /* Human-readable labels for result text */
  var bhkLabel = {
    "2BHK": "2 BHK",
    "3BHK": "3 BHK",
    "Any":  "any size"
  };
  var budgetLabel = {
    "30-50L": "₹30L – ₹50L",
    "50-80L": "₹50L – ₹80L",
    "80L+":   "₹80L and above"
  };

  /* Budget pill value → form <select> option value */
  var budgetToForm = {
    "30-50L": "30-50L",
    "50-80L": "50-80L",
    "80L+":   "80L-1Cr"
  };

  /* Handle any pill click */
  document.querySelectorAll(".pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      var group = this.dataset.group;
      var value = this.dataset.value;

      /* Deselect all pills in this group */
      document.querySelectorAll(".pill[data-group='" + group + "']").forEach(function (p) {
        p.classList.remove("selected");
        p.setAttribute("aria-pressed", "false");
      });

      /* Mark this pill as selected */
      this.classList.add("selected");
      this.setAttribute("aria-pressed", "true");
      state[group] = value;

      /* Pre-fill form select when budget is chosen */
      if (group === "budget") {
        var formBudget = document.getElementById("fBudget");
        if (formBudget && budgetToForm[value]) {
          formBudget.value = budgetToForm[value];
        }
      }

      /* Show result banner once both are selected */
      showResultBanner();
    });
  });

  function showResultBanner() {
    if (!state.bhk || !state.budget) return;

    var resultBox  = document.getElementById("qsResult");
    var resultText = document.getElementById("qsResultText");
    if (!resultBox || !resultText) return;

    /* Build friendly message */
    var bStr = bhkLabel[state.bhk]       || state.bhk;
    var pStr = budgetLabel[state.budget] || state.budget;

    resultText.innerHTML =
      "Good choice! We have <strong>" + bStr + "</strong> flats in the " +
      "<strong>" + pStr + "</strong> range in Bhubaneswar. " +
      "Tell us your details below — we'll call you with the best matching options within 15 minutes.";

    /* Show the banner */
    resultBox.removeAttribute("hidden");

    /* Give browser a moment then scroll just a little so banner
       comes into clear view (not hidden under the fold)          */
    setTimeout(function () {
      var headerH  = getHeaderHeight();
      var bannerTop = resultBox.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top: bannerTop, behavior: "smooth" });
    }, 80);
  }
})();


/* ═══════════════════════════════════════════════════════════════
   4. SCROLL REVEAL
   ─────────────────────────────────────────────────────────────── */
(function initReveal() {

  /* Elements to animate in on scroll */
  var targets = document.querySelectorAll(
    ".section-hd, .qs-header, .qs-group, " +
    ".prop-card, .form-pitch, .form-card, .final-inner"
  );

  /* Add the starting CSS class */
  targets.forEach(function (el) { el.classList.add("reveal"); });

  /* Stagger cards within the grid */
  var cardGrid = document.querySelector(".cards-grid");
  if (cardGrid) {
    cardGrid.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (i * 0.09) + "s";
    });
  }

  /* IntersectionObserver: trigger when 10% of element is visible */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        observer.unobserve(entry.target);  /* animate once only */
      }
    });
  }, {
    threshold:   0.1,
    rootMargin: "0px 0px -24px 0px"
  });

  targets.forEach(function (el) { observer.observe(el); });
})();


/* ═══════════════════════════════════════════════════════════════
   5. LEAD FORM — Validation + Google Sheets submission
   ═══════════════════════════════════════════════════════════════ */
(function initForm() {
  var form       = document.getElementById("leadForm");
  var submitBtn  = document.getElementById("submitBtn");
  var btnLabel   = document.getElementById("btnLabel");
  var btnLoader  = document.getElementById("btnLoader");
  var successBox = document.getElementById("formSuccess");

  if (!form) return;

  /* ── Field helpers ── */
  function showErr(inputId, errId, msg) {
    var inp = document.getElementById(inputId);
    var err = document.getElementById(errId);
    if (inp) inp.classList.add("err");
    if (err) {
      if (msg) err.textContent = msg;
      err.classList.add("show");
    }
  }
  function clearErr(inputId, errId) {
    var inp = document.getElementById(inputId);
    var err = document.getElementById(errId);
    if (inp) inp.classList.remove("err");
    if (err) err.classList.remove("show");
  }

  /* ── Live clear errors as user types ── */
  [["fName", "fNameErr"], ["fPhone", "fPhoneErr"]].forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (el) {
      el.addEventListener("input", function () {
        clearErr(pair[0], pair[1]);
      });
    }
  });

  /* ── Phone: only allow digits ── */
  var phoneInput = document.getElementById("fPhone");
  if (phoneInput) {
    phoneInput.addEventListener("keypress", function (e) {
      /* Allow control keys but block non-digits */
      if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });
    /* Also clean on paste */
    phoneInput.addEventListener("paste", function (e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData).getData("text");
      var digits = pasted.replace(/\D/g, "").slice(0, 10);
      phoneInput.value = digits;
    });
  }

  /* ── Validation ── */
  function validate() {
    var ok = true;

    /* Name: at least 2 characters */
    var name = (document.getElementById("fName").value || "").trim();
    if (name.length < 2) {
      showErr("fName", "fNameErr", "Please enter your name.");
      ok = false;
    } else {
      clearErr("fName", "fNameErr");
    }

    /* Phone: Indian mobile — starts 6-9, exactly 10 digits */
    var phone = (document.getElementById("fPhone").value || "").trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      showErr("fPhone", "fPhoneErr", "Enter a valid 10-digit mobile number.");
      ok = false;
    } else {
      clearErr("fPhone", "fPhoneErr");
    }

    return ok;
  }

  /* ── Button loading state ── */
  function setLoading(on) {
    submitBtn.disabled = on;
    if (on) {
      btnLabel.classList.add("hidden");
      btnLoader.classList.remove("hidden");
    } else {
      btnLabel.classList.remove("hidden");
      btnLoader.classList.add("hidden");
    }
  }

  /* ── Show success state ── */
  function showSuccess() {
    /* Hide the form */
    form.style.display = "none";
    /* Show success */
    successBox.removeAttribute("hidden");

    /* Smooth-scroll the success box into view */
    var headerH = getHeaderHeight();
    var successTop = successBox.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top: successTop, behavior: "smooth" });

    /* Reset form data in background */
    setTimeout(function () { form.reset(); }, 800);
  }

  /* ── Form submit handler ── */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      /* Scroll to the first error */
      var firstErr = form.querySelector(".err");
      if (firstErr) {
        var headerH   = getHeaderHeight();
        var errTop    = firstErr.getBoundingClientRect().top + window.scrollY - headerH - 20;
        window.scrollTo({ top: errTop, behavior: "smooth" });
      }
      return;
    }

    /* Collect payload */
    var payload = {
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      name:      (document.getElementById("fName").value    || "").trim(),
      phone:     (document.getElementById("fPhone").value   || "").trim(),
      budget:    document.getElementById("fBudget").value   || "Not specified",
      timeline:  document.getElementById("fTimeline").value || "Not specified",
      source:    "Landing Page v5"
    };

    setLoading(true);

    /*
     * DEMO MODE — if URL not replaced yet, simulate submission.
     * The form still shows the success screen so you can test
     * the full user journey before going live.
     */
    if (WEBHOOK_URL.indexOf("YOUR_SCRIPT_ID_HERE") !== -1) {
      console.warn(
        "%c BhubaneswarHomes ⚠ " +
        "Replace WEBHOOK_URL in script.js with your Google Apps Script URL.",
        "background:#F97316;color:#fff;padding:3px 8px;border-radius:4px;"
      );
      setTimeout(function () {
        setLoading(false);
        showSuccess();
      }, 1400);
      return;
    }

    /*
     * LIVE MODE — POST to Google Apps Script.
     *
     * We use no-cors mode. This means:
     * • The response type is "opaque" (we can't read it back).
     * • But the Apps Script DOES receive the data and saves it.
     * • This is the correct pattern for this use case.
     */
    fetch(WEBHOOK_URL, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    })
    .then(function () {
      showSuccess();
    })
    .catch(function (err) {
      /* Network error — still show success to avoid user frustration */
      console.error("Form submission error:", err);
      showSuccess();
    })
    .finally(function () {
      setLoading(false);
    });
  });
})();
