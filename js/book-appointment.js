(() => {
  "use strict";

  const API = "https://test.govjobupdates.com/live-test/ayurveda-api";
  const form = document.getElementById("appointmentForm");
  if (!form) return;

  const $ = (id) => document.getElementById(id);
  const phone = $("phone"), concern = $("mainConcern"), count = $("concernCount");
  const date = $("preferredDate"), type = $("consultationType"), notice = $("frontendNotice");
  const submit = form.querySelector('.submit-btn[type="submit"]');
  const modeCards = [...document.querySelectorAll(".mode-card")];
  const feeNote = type.closest(".field")?.querySelector(".field-note span");
  let types = [], pending = null, razorpayPromise = null;

  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  date.min = today;

  const money = (p) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: Number(p) % 100 ? 2 : 0
  }).format(Number(p || 0) / 100);

  const formatTime = (v) => {
    if (!/^\d{2}:\d{2}$/.test(String(v || ""))) return v || "";
    const [h, m] = v.split(":").map(Number);
    return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  function message(title, text, state = "info") {
    if (!notice) return;
    const strong = notice.querySelector("strong"), span = notice.querySelector("span");
    if (strong) strong.textContent = title;
    if (span) span.textContent = text;
    notice.dataset.state = state;
    notice.hidden = false;
  }

  function busy(on) {
    if (!submit) return;
    submit.disabled = on;
    submit.setAttribute("aria-busy", on ? "true" : "false");
    const label = submit.querySelector("span");
    if (label) label.textContent = on ? "Preparing Payment..." : "Request Appointment";
  }

  const selectedMode = () => form.querySelector('input[name="consultation_mode"]:checked')?.value || "";
  const selectedType = () => types.find((x) => Number(x.id) === Number(type.value)) || null;

  function updateFee() {
    if (!feeNote) return;
    const c = selectedType(), mode = selectedMode();
    if (!c) return void (feeNote.textContent = "Choose a consultation type to view the applicable fee.");
    if (!mode) return void (feeNote.textContent = "Choose in-person or online consultation to view the applicable fee.");
    if (mode === "online") {
      feeNote.textContent = `Online consultation fee: ${money(c.online_consultation_fee_paise)}. Full payment is collected online.`;
    } else {
      const total = Number(c.total_fee_paise || 0), online = Math.min(total, Number(c.in_person_online_paise || 0));
      feeNote.textContent = `Total: ${money(total)} • Pay online now: ${money(online)} • Pay at clinic: ${money(Math.max(0, total - online))}.`;
    }
  }

  async function loadTypes() {
    type.disabled = true;
    type.innerHTML = '<option value="">Loading consultation types...</option>';
    try {
      const r = await fetch(`${API}/consultation-types.php`, { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.success) throw new Error(data.message || "Unable to load consultation types.");
      types = Array.isArray(data.consultation_types) ? data.consultation_types : [];
      type.innerHTML = '<option value="">Select consultation type</option>';
      types.forEach((c) => {
        const o = document.createElement("option"); o.value = String(c.id); o.textContent = c.name; type.appendChild(o);
      });
      type.disabled = !types.length;

      if (data.timing?.start && data.timing?.end) {
        const timing = `${formatTime(data.timing.start)} – ${formatTime(data.timing.end)}`;
        const side = document.querySelector(".timing-card strong");
        if (side) side.textContent = timing;
        document.querySelectorAll(".booking-meta span").forEach((el) => {
          if (el.textContent.includes("Consultation Hours")) el.innerHTML = `<i data-lucide="clock-3"></i><strong>Consultation Hours</strong> ${timing}`;
        });
        document.querySelectorAll(".field-note span").forEach((el) => {
          if (el.textContent.includes("Consultation hours:")) el.textContent = `Consultation hours: ${timing}. Final timing will be confirmed by the clinic.`;
        });
        window.lucide?.createIcons();
      }
      if (!types.length) message("Booking unavailable", "No consultation type is currently available. Please contact the clinic.", "error");
    } catch (e) {
      types = []; type.innerHTML = '<option value="">Consultation types unavailable</option>'; type.disabled = true;
      message("Unable to load booking options", e.message || "Please try again shortly.", "error");
    }
  }

  modeCards.forEach((card) => card.querySelector('input[type="radio"]').addEventListener("change", () => {
    modeCards.forEach((x) => x.classList.remove("is-selected")); card.classList.add("is-selected"); clearError("consultation_mode"); pending = null; updateFee();
  }));
  type.addEventListener("change", () => { clearError("consultationType"); pending = null; updateFee(); });
  phone.addEventListener("input", () => { phone.value = phone.value.replace(/\D/g, "").slice(0, 10); pending = null; });
  concern.addEventListener("input", () => { count.textContent = String(concern.value.length); pending = null; });
  form.addEventListener("input", () => { if (notice) notice.hidden = true; });

  const errEl = (k) => document.querySelector(`[data-error-for="${k}"]`);
  function setError(k, m) { const e = errEl(k); if (e) e.textContent = m; }
  function clearError(k) { setError(k, ""); }
  function validate() {
    document.querySelectorAll(".field-error").forEach((e) => e.textContent = "");
    let ok = true;
    const name = $("fullName"), email = $("email"), age = $("age"), gender = $("gender"), consent = $("consent");
    if (name.value.trim().length < 2) { setError("fullName", "Please enter the patient name."); ok = false; }
    if (!/^[6-9]\d{9}$/.test(phone.value)) { setError("phone", "Enter a valid 10-digit Indian mobile number."); ok = false; }
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setError("email", "Enter a valid email address."); ok = false; }
    if (!age.value || Number(age.value) < 1 || Number(age.value) > 120) { setError("age", "Enter a valid age."); ok = false; }
    if (!gender.value) { setError("gender", "Please select gender."); ok = false; }
    if (!selectedMode()) { setError("consultation_mode", "Please choose in-person or online consultation."); ok = false; }
    if (!type.value) { setError("consultationType", "Please select a consultation type."); ok = false; }
    if (concern.value.trim().length < 5) { setError("mainConcern", "Please briefly describe the main concern."); ok = false; }
    if (!date.value) { setError("preferredDate", "Please choose a preferred date."); ok = false; }
    else if (date.value < today) { setError("preferredDate", "Preferred date cannot be in the past."); ok = false; }
    if (!consent.checked) { setError("consent", "Please confirm before submitting."); ok = false; }
    return ok;
  }

  const payload = () => ({
    full_name: $("fullName").value.trim(), phone: phone.value, email: $("email").value.trim(),
    age: Number($("age").value), gender: $("gender").value, consultation_mode: selectedMode(),
    consultation_type_id: Number(type.value), main_concern: concern.value.trim(), preferred_date: date.value
  });

  async function post(path, body) {
    const r = await fetch(`${API}/${path}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.success) throw new Error(Array.isArray(data.errors) ? data.errors.join(" ") : data.message || "Request could not be completed.");
    return data;
  }

  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    if (razorpayPromise) return razorpayPromise;
    razorpayPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
      s.onload = resolve; s.onerror = () => reject(new Error("Secure payment window could not be loaded.")); document.head.appendChild(s);
    });
    return razorpayPromise;
  }

  async function getOrder(data) {
    const key = JSON.stringify(data);
    if (pending?.key === key && pending.data?.order_id) return pending.data;
    const order = await post("create-order.php", data); pending = { key, data: order }; return order;
  }

  function checkout(order) {
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: order.key_id, amount: order.amount_paise, currency: order.currency || "INR", order_id: order.order_id,
        name: "Utkrishti Ayurveda", description: `Appointment ${order.appointment_no}`,
        prefill: { name: order.patient?.name || "", email: order.patient?.email || "", contact: order.patient?.mobile ? `+91${order.patient.mobile}` : "" },
        notes: { appointment_no: order.appointment_no }, theme: { color: "#173e2c" }, retry: { enabled: true },
        handler: resolve,
        modal: { ondismiss: () => reject(new Error("Payment window was closed. Your appointment is not confirmed yet.")) }
      });
      rzp.on("payment.failed", (x) => reject(new Error(x?.error?.description || "Payment failed. Please try again.")));
      rzp.open();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); if (notice) notice.hidden = true;
    if (!validate()) {
      const first = [...document.querySelectorAll(".field-error")].find((x) => x.textContent.trim());
      first?.closest(".field, .consent-row")?.scrollIntoView({ behavior: "smooth", block: "center" }); return;
    }
    busy(true);
    try {
      const data = payload();
      const [order] = await Promise.all([getOrder(data), loadRazorpay()]);
      const balance = Number(order.clinic_balance_paise || 0) > 0 ? ` Remaining ${money(order.clinic_balance_paise)} is payable at the clinic.` : "";
      message("Secure payment ready", `Pay ${money(order.amount_paise)} online to submit appointment ${order.appointment_no}.${balance}`);
      busy(false);
      const pay = await checkout(order);
      busy(true);
      const verified = await post("verify-payment.php", {
        razorpay_order_id: pay.razorpay_order_id, razorpay_payment_id: pay.razorpay_payment_id, razorpay_signature: pay.razorpay_signature
      });
      pending = null; form.reset(); modeCards.forEach((x) => x.classList.remove("is-selected")); count.textContent = "0"; updateFee();
      message("Appointment request submitted", `Payment verified successfully. Your appointment number is ${verified.appointment_no}. Please save this number for tracking.`, "success");
      notice?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      message("Booking not completed", err.message || "Something went wrong. Please try again.", "error");
      notice?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally { busy(false); }
  });

  const year = $("currentYear"); if (year) year.textContent = new Date().getFullYear();
  loadTypes();
  if (window.lucide) window.lucide.createIcons(); else window.addEventListener("load", () => window.lucide?.createIcons());
})();