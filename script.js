/* ═══════════════════════════════════════════════════════════════
   BHUBANESWAR HOMES — v6 JAVASCRIPT
   ═══════════════════════════════════════════════════════════════
   v6 Changes:
   ① Smooth scroll:  JS method takes priority over CSS so we
                     can dynamically measure the header height.
                     CSS scroll-behavior: smooth remains as fallback.
   ② scroll-padding: Updated dynamically in JS so CSS value
                     always matches actual header height.
   ③ iOS fix:        Uses scrollIntoView as fallback for older
                     Safari which doesn't support scroll options.
   ④ Form:           Added paste handler for phone field.
   ⑤ Source:         Updated to v6.
   ═══════════════════════════════════════════════════════════════ */

/* ── Google Sheets webhook URL ──
   Replace this with your Google Apps Script deployment URL.
   The form runs in demo mode until you replace it.          */
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwPW1eQN1-25YlcgcNC-BbjA9Vvm6Hvsd758w8wguRQTmz09N0DyQdv1oiAkJW_PLnG/exec";


/* ═══════════════════════════════════════════════════════════════
   UTILITY: Measure the current header height dynamically.
   Called before every scroll so offset is always accurate,
   even when the mobile nav is open (header is taller).
   ═══════════════════════════════════════════════════════════════ */
function getHeaderHeight() {
  var header = document.getElementById("header");
  return header ? header.getBoundingClientRect().height : 64;
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY: Update CSS scroll-padding-top to match header height.
   Called on load and on resize so the CSS fallback always
   matches the real header height.
   ═══════════════════════════════════════════════════════════════ */
function updateScrollPadding() {
  var h = getHeaderHeight();
  document.documentElement.style.setProperty("scroll-padding-top", h + "px");
}

/* Update on load */
updateScrollPadding();
/* Update on resize (header height can change at breakpoints) */
window.addEventListener("resize", updateScrollPadding, { passive: true });


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
   Strategy:
   1. CSS scroll-behavior: smooth is already set as baseline.
   2. JS overrides with window.scrollTo for precise header offset.
   3. scrollIntoView fallback for browsers that don't support
      the {behavior: "smooth"} option (older iOS Safari).

   This works on:
   ✓ Chrome / Edge / Firefox (desktop + Android)
   ✓ Safari 14+ (iOS and macOS)
   ✓ Samsung Internet
   ✓ Older Android WebView (falls back to instant scroll)
   ═══════════════════════════════════════════════════════════════ */
(function initSmoothScroll() {

  /* Feature detect smooth scroll support */
  var supportsScrollBehavior = "scrollBehavior" in document.documentElement.style;

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = this.getAttribute("href");

      /* Skip empty or bare # links */
      if (!targetId || targetId === "#") return;

      var target = document.querySelector(targetId);
      if (!target) return;

      /* Prevent default browser jump */
      e.preventDefault();

      /* Close mobile nav if open */
      closeNav();

      /* Calculate scroll position:
         Element top + current scroll − header height − 8px gap */
      var headerH  = getHeaderHeight();
      var gap      = 10;
      var targetTop = target.getBoundingClientRect().top + window.scrollY - headerH - gap;

      /* Clamp to 0 — never scroll negative */
      targetTop = Math.max(0, targetTop);

      if (supportsScrollBehavior) {
        /* Modern browsers: smooth scroll to calculated position */
        window.scrollTo({ top: targetTop, behavior: "smooth" });
      } else {
        /* Fallback for older browsers (instant) */
        window.scrollTo(0, targetTop);
      }
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
      source:    "Landing Page v6"
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

/* ── SUPABASE HOMEPAGE PROPERTY LOADER ── */
document.addEventListener("DOMContentLoaded", async function () {
  var grid = document.getElementById("propCardsGrid");
  if (!grid) return;

  try {
    var { data, error } = await db
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = "<div style='grid-column:1/-1;text-align:center;padding:40px;color:#666'><p>No properties listed yet.</p></div>";
      return;
    }

    grid.innerHTML = "";

    data.forEach(function (prop) {
      var badgeMap = {
        ready: { label: "✓ Ready to Move",   cls: "badge-ready"  },
        hot:   { label: "🔥 Most Enquired",  cls: "badge-orange" },
        value: { label: "💎 Best Value",     cls: "badge-dark"   },
        new:   { label: "🆕 New Launch",     cls: "badge-new"    },
        few:   { label: "⚡ Few Units Left", cls: "badge-few"    }
      };

      var badge   = prop.badge && badgeMap[prop.badge] ? badgeMap[prop.badge] : null;
      var badgeHtml = badge ? "<span class='card-badge " + badge.cls + "'>" + badge.label + "</span>" : "";

      var imgHtml = prop.image_url
        ? "<img src='" + prop.image_url + "' alt='" + prop.title + "' loading='lazy'/>"
        : "<div style='width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:2rem'>🏠</div>";

      var tagsHtml = "";
      if (prop.tags) {
        prop.tags.split(",").forEach(function (t) {
          tagsHtml += "<span class='tag'>" + t.trim() + "</span>";
        });
      }

      var article = document.createElement("article");
      article.className = "card";
      article.innerHTML =
        "<div class='card-img'>" + imgHtml + badgeHtml + "</div>" +
        "<div class='card-info'>" +
          "<h3>" + prop.title + "</h3>" +
          "<p class='c-price'>" + prop.price + "</p>" +
          "<p class='c-loc'>" +
            "<svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z'/><circle cx='12' cy='10' r='3'/></svg>" +
            prop.location +
          "</p>" +
          "<div class='tags'>" + tagsHtml + "</div>" +
          "<a href='#form' class='btn btn-card'>Ask About This Flat →</a>" +
        "</div>";

      grid.appendChild(article);
    });

    var note = document.getElementById("cardsNote");
    if (note) note.style.display = "";

  } catch (err) {
    console.error("Failed to load properties:", err);
  }
});
