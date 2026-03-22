/* ================================================================
   BHUBANESWAR HOMES — ADMIN PANEL LOGIC
   admin.js
   ================================================================ */
"use strict";
/* ── AUTH: Login + session check ── */
async function doLogin() {
  var email    = document.getElementById("loginEmail").value.trim();
  var password = document.getElementById("loginPassword").value;
  var err      = document.getElementById("loginErr");
  var btn      = document.getElementById("loginBtn");

  if (!email || !password) {
    err.textContent = "Please enter email and password.";
    err.style.display = "block";
    return;
  }

  btn.textContent = "Logging in…";
  btn.disabled    = true;

  var { data, error } = await db.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    err.textContent    = "Wrong email or password.";
    err.style.display  = "block";
    btn.textContent    = "Login";
    btn.disabled       = false;
    return;
  }

  showAdminPanel();
}

function showAdminPanel() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminPanel").style.display  = "block";
  initAll();
}

function hideAdminPanel() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("adminPanel").style.display  = "none";
}

/* Check if already logged in on page load */
/* ── SINGLE DOMContentLoaded ── */
document.addEventListener("DOMContentLoaded", async function () {

  /* Check if already logged in */
  var { data } = await db.auth.getSession();
  if (data.session) {
    showAdminPanel();
  }
});

/* Called after login or on session restore */
function initAll() {
  initImagePicker();
  initForm();
  initRefresh();
  initReplaceModal();
  initDeleteModal();
  loadProperties();
}


/* ── Globals ── */
const TABLE   = "properties";
const BUCKET  = "property-images";

let selectedFile    = null;   /* file for new upload */
let replaceFile     = null;   /* file for replace-image flow */
let replaceTargetId = null;   /* property id being replaced */
let deleteTargetId  = null;   /* property id being deleted */
let allProperties   = [];     /* local cache of properties */

/* ── DOM refs ── */
const uploadForm    = document.getElementById("uploadForm");
const imgInput      = document.getElementById("imgInput");
const imgArea       = document.getElementById("imgArea");
const imgPrompt     = document.getElementById("imgPrompt");
const previewWrap   = document.getElementById("previewWrap");
const imgPreview    = document.getElementById("imgPreview");
const pickImgBtn    = document.getElementById("pickImgBtn");
const changeImgBtn  = document.getElementById("changeImgBtn");
const uploadBtn     = document.getElementById("uploadBtn");
const uploadBtnText = document.getElementById("uploadBtnText");
const uploadProg    = document.getElementById("uploadProgress");
const progressBar   = document.getElementById("progressBar");
const progressText  = document.getElementById("progressText");
const successAlert  = document.getElementById("successAlert");
const successMsg    = document.getElementById("successMsg");
const errorAlert    = document.getElementById("errorAlert");
const errorMsg      = document.getElementById("errorMsg");
const propList      = document.getElementById("propList");
const listSkeleton  = document.getElementById("listSkeleton");
const emptyState    = document.getElementById("emptyState");
const errorState    = document.getElementById("errorState");
const propCount     = document.getElementById("propCount");



/* ================================================================
   IMAGE PICKER — drag & drop + click to pick
   ================================================================ */
function initImagePicker() {
  /* Click on area → open file picker */
  imgArea.addEventListener("click", function (e) {
    if (e.target === changeImgBtn || changeImgBtn.contains(e.target)) return;
    imgInput.click();
  });

  /* Separate "Choose Image" button */
  pickImgBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    imgInput.click();
  });

  /* Change image button */
  changeImgBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    imgInput.click();
  });

  /* File selected */
  imgInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      handleImageSelect(this.files[0]);
    }
  });

  /* Drag & drop */
  imgArea.addEventListener("dragover", function (e) {
    e.preventDefault(); imgArea.classList.add("drag-over");
  });
  imgArea.addEventListener("dragleave", function () {
    imgArea.classList.remove("drag-over");
  });
  imgArea.addEventListener("drop", function (e) {
    e.preventDefault(); imgArea.classList.remove("drag-over");
    var file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageSelect(file);
    }
  });
}

function handleImageSelect(file) {
  /* 5MB limit */
  if (file.size > 5 * 1024 * 1024) {
    showError("Image must be under 5MB. Please choose a smaller file.");
    return;
  }
  selectedFile = file;
  var reader   = new FileReader();
  reader.onload = function (e) {
    imgPreview.src = e.target.result;
    imgPrompt.style.display  = "none";
    previewWrap.removeAttribute("hidden");
  };
  reader.readAsDataURL(file);
}


/* ================================================================
   UPLOAD FORM SUBMIT
   ================================================================ */
function initForm() {
  uploadForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlerts();

    /* Validate */
    var valid = validateForm();
    if (!valid) return;

    /* Disable button + show progress */
    uploadBtn.disabled    = true;
    uploadBtnText.textContent = "Uploading…";
    uploadProg.removeAttribute("hidden");
    animateProgress(30);

    try {
      var title    = document.getElementById("propTitle").value.trim();
      var price    = "₹" + document.getElementById("propPrice").value.trim();
      var location = document.getElementById("propLocation").value.trim();
      var tagsRaw  = document.getElementById("propTags").value.trim();
      var badgeKey = document.getElementById("propBadge").value;

      /* Upload image if selected */
      var imageUrl = "";
      if (selectedFile) {
        animateProgress(50);
        progressText.textContent = "Uploading image…";
        imageUrl = await uploadImageToStorage(selectedFile);
        animateProgress(80);
      }

      progressText.textContent = "Saving property…";

      /* Insert into Supabase */
      var { data, error } = await db.from(TABLE).insert([{
        title:     title,
        price:     price,
        location:  location,
        image_url: imageUrl,
        tags:      tagsRaw,
        badge:     badgeKey
      }]).select();

      if (error) throw error;

      animateProgress(100);
      progressText.textContent = "Done!";

      /* Show success */
      setTimeout(function () {
        uploadProg.setAttribute("hidden", "");
        progressBar.style.width = "0%";
        showSuccess("✅ Property uploaded! It is now live on your homepage.");
        resetForm();
        loadProperties();
      }, 600);

    } catch (err) {
      console.error("Upload error:", err);
      uploadProg.setAttribute("hidden", "");
      progressBar.style.width = "0%";
      showError("Upload failed: " + (err.message || "Unknown error. Check Supabase config."));
    } finally {
      uploadBtn.disabled         = false;
      uploadBtnText.textContent  = "Upload Property";
    }
  });
}

/* Upload image file to Supabase Storage, return public URL */
async function uploadImageToStorage(file) {
  var ext      = file.name.split(".").pop();
  var path     = "prop-" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;

  var { data, error } = await db.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) throw new Error("Image upload failed: " + error.message);

  /* Get public URL */
  var { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

function validateForm() {
  var ok = true;

  var title = document.getElementById("propTitle").value.trim();
  var titleErr = document.getElementById("titleErr");
  if (title.length < 2) {
    document.getElementById("propTitle").classList.add("err");
    titleErr.classList.add("show");
    ok = false;
  } else {
    document.getElementById("propTitle").classList.remove("err");
    titleErr.classList.remove("show");
  }

  var price = document.getElementById("propPrice").value.trim();
  var priceErr = document.getElementById("priceErr");
  if (!price) {
    document.getElementById("propPrice").classList.add("err");
    priceErr.classList.add("show");
    ok = false;
  } else {
    document.getElementById("propPrice").classList.remove("err");
    priceErr.classList.remove("show");
  }

  var loc = document.getElementById("propLocation").value.trim();
  var locErr = document.getElementById("locationErr");
  if (loc.length < 2) {
    document.getElementById("propLocation").classList.add("err");
    locErr.classList.add("show");
    ok = false;
  } else {
    document.getElementById("propLocation").classList.remove("err");
    locErr.classList.remove("show");
  }

  return ok;
}

function resetForm() {
  uploadForm.reset();
  selectedFile = null;
  imgPrompt.style.display = "";
  previewWrap.setAttribute("hidden", "");
  imgPreview.src = "";
  imgInput.value = "";
}

function animateProgress(pct) {
  progressBar.style.width = pct + "%";
}


/* ================================================================
   LOAD PROPERTIES (List Panel)
   ================================================================ */
function initRefresh() {
  document.getElementById("refreshBtn").addEventListener("click", loadProperties);
  var retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.addEventListener("click", loadProperties);
}

async function loadProperties() {
  /* Show skeleton */
  listSkeleton.removeAttribute("hidden");
  propList.setAttribute("hidden", "");
  emptyState.setAttribute("hidden", "");
  errorState.setAttribute("hidden", "");
  propCount.textContent = "Loading…";

  try {
    var { data, error } = await db
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allProperties = data || [];
    renderList(allProperties);

  } catch (err) {
    console.error("Load error:", err);
    listSkeleton.setAttribute("hidden", "");
    errorState.removeAttribute("hidden");
    propCount.textContent = "Error";
  }
}

function renderList(props) {
  listSkeleton.setAttribute("hidden", "");
  propCount.textContent = props.length + " propert" + (props.length === 1 ? "y" : "ies");

  if (props.length === 0) {
    emptyState.removeAttribute("hidden");
    propList.setAttribute("hidden", "");
    return;
  }

  propList.innerHTML = "";
  props.forEach(function (prop) {
    propList.appendChild(buildListItem(prop));
  });
  propList.removeAttribute("hidden");
}

function buildListItem(prop) {
  var div = document.createElement("div");
  div.className = "prop-list-item";
  div.dataset.id = prop.id;

  var date = new Date(prop.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  var badgeHtml = prop.badge ? "<span class='pli-badge " + getBadgeClass(prop.badge) + "'>" + getBadgeLabel(prop.badge) + "</span>" : "";

  div.innerHTML = "\
    <div class='pli-thumb'>\
      " + (prop.image_url
        ? "<img src='" + prop.image_url + "' alt='" + esc(prop.title) + "' loading='lazy'/>"
        : "<div class='pli-thumb-placeholder'>🏠</div>") + "\
    </div>\
    <div class='pli-info'>\
      <p class='pli-title'>" + esc(prop.title) + "</p>\
      <p class='pli-price'>" + esc(prop.price) + "</p>\
      <p class='pli-loc'>" + esc(prop.location) + "</p>\
      <div class='pli-meta'>\
        " + badgeHtml + "\
        <span class='pli-date'>Added " + date + "</span>\
      </div>\
    </div>\
    <div class='pli-actions'>\
      <button class='pli-btn pli-btn-replace' title='Replace image'>\
        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'/></svg>\
        Replace\
      </button>\
      <button class='pli-btn pli-btn-delete' title='Delete property'>\
        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2'/></svg>\
        Delete\
      </button>\
    </div>";

  /* Wire up buttons */
  div.querySelector(".pli-btn-replace").addEventListener("click", function () {
    openReplaceModal(prop);
  });
  div.querySelector(".pli-btn-delete").addEventListener("click", function () {
    openDeleteModal(prop);
  });

  return div;
}


/* ================================================================
   REPLACE IMAGE MODAL
   ================================================================ */
function initReplaceModal() {
  var modal       = document.getElementById("replaceModal");
  var closeBtn    = document.getElementById("modalClose");
  var cancelBtn   = document.getElementById("cancelReplace");
  var confirmBtn  = document.getElementById("confirmReplace");
  var replInput   = document.getElementById("replaceInput");
  var newPreview  = document.getElementById("replaceNewPreview");
  var newWrap     = document.getElementById("replaceNewWrap");

  closeBtn.addEventListener("click",  closeReplaceModal);
  cancelBtn.addEventListener("click", closeReplaceModal);

  /* Close on overlay click */
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeReplaceModal();
  });

  /* File picker */
  document.querySelector(".replace-pick-btn").addEventListener("click", function () {
    replInput.click();
  });

  replInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      replaceFile = this.files[0];
      var reader = new FileReader();
      reader.onload = function (e) {
        newPreview.src = e.target.result;
        newWrap.querySelector(".replace-pick-btn").style.display = "none";
        newPreview.removeAttribute("hidden");
        confirmBtn.disabled = false;
      };
      reader.readAsDataURL(replaceFile);
    }
  });

  /* Confirm replace */
  confirmBtn.addEventListener("click", async function () {
    if (!replaceFile || !replaceTargetId) return;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Replacing…";

    try {
      var newUrl = await uploadImageToStorage(replaceFile);
      var { error } = await db.from(TABLE).update({ image_url: newUrl }).eq("id", replaceTargetId);
      if (error) throw error;
      closeReplaceModal();
      loadProperties();
    } catch (err) {
      alert("Replace failed: " + (err.message || "Unknown error"));
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Replace Image";
    }
  });
}

function openReplaceModal(prop) {
  replaceTargetId = prop.id;
  replaceFile     = null;

  document.getElementById("replacePropertyName").textContent  = prop.title;
  document.getElementById("replaceCurrentImg").src            = prop.image_url || "";
  document.getElementById("replaceNewPreview").setAttribute("hidden", "");
  document.getElementById("replaceNewPreview").src            = "";
  document.getElementById("replaceInput").value               = "";
  document.getElementById("confirmReplace").disabled          = true;
  document.getElementById("confirmReplace").innerHTML         = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg> Replace Image';
  document.querySelector(".replace-pick-btn").style.display   = "";
  document.getElementById("replaceModal").removeAttribute("hidden");
}

function closeReplaceModal() {
  document.getElementById("replaceModal").setAttribute("hidden", "");
  replaceTargetId = null;
  replaceFile     = null;
}


/* ================================================================
   DELETE MODAL
   ================================================================ */
function initDeleteModal() {
  var modal      = document.getElementById("deleteModal");
  var closeBtn   = document.getElementById("deleteModalClose");
  var cancelBtn  = document.getElementById("cancelDelete");
  var confirmBtn = document.getElementById("confirmDelete");

  closeBtn.addEventListener("click",  closeDeleteModal);
  cancelBtn.addEventListener("click", closeDeleteModal);

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeDeleteModal();
  });

  confirmBtn.addEventListener("click", async function () {
    if (!deleteTargetId) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";

    try {
      var { error } = await db.from(TABLE).delete().eq("id", deleteTargetId);
      if (error) throw error;
      closeDeleteModal();
      loadProperties();
    } catch (err) {
      alert("Delete failed: " + (err.message || "Unknown error"));
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Yes, Delete";
    }
  });
}

function openDeleteModal(prop) {
  deleteTargetId = prop.id;
  document.getElementById("deletePropertyName").textContent = prop.title;
  document.getElementById("confirmDelete").disabled = false;
  document.getElementById("confirmDelete").innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> Yes, Delete';
  document.getElementById("deleteModal").removeAttribute("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").setAttribute("hidden", "");
  deleteTargetId = null;
}


/* ================================================================
   BADGE HELPERS
   ================================================================ */
var BADGE_MAP = {
  ready: { label: "✓ Ready to Move",  cls: "badge-ready" },
  hot:   { label: "🔥 Most Enquired", cls: "badge-hot"   },
  value: { label: "💎 Best Value",    cls: "badge-value" },
  new:   { label: "🆕 New Launch",    cls: "badge-new"   },
  few:   { label: "⚡ Few Units Left",cls: "badge-few"   }
};

function getBadgeLabel(key) { return BADGE_MAP[key] ? BADGE_MAP[key].label : key; }
function getBadgeClass(key) { return BADGE_MAP[key] ? BADGE_MAP[key].cls  : "";  }


/* ================================================================
   ALERT HELPERS
   ================================================================ */
function showSuccess(msg) {
  successMsg.textContent = msg;
  successAlert.removeAttribute("hidden");
  setTimeout(function () { successAlert.setAttribute("hidden", ""); }, 6000);
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorAlert.removeAttribute("hidden");
  setTimeout(function () { errorAlert.setAttribute("hidden", ""); }, 8000);
}

function hideAlerts() {
  successAlert.setAttribute("hidden", "");
  errorAlert.setAttribute("hidden", "");
}


/* ================================================================
   UTILITY: HTML escape
   ================================================================ */
function esc(str) {
  return (str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
