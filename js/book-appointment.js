(() => {
  "use strict";

  const form = document.getElementById("appointmentForm");
  if (!form) return;

  const modeCards = [...document.querySelectorAll(".mode-card")];
  const phone = document.getElementById("phone");
  const concern = document.getElementById("mainConcern");
  const count = document.getElementById("concernCount");
  const preferredDate = document.getElementById("preferredDate");
  const notice = document.getElementById("frontendNotice");
  const consultationType = document.getElementById("consultationType");

  // Backend hook:
  // Replace these preview values by calling your API and populating this select.
  // Example payload expected:
  // [{ id: "general", name: "General Ayurvedic Consultation" }, ...]
  const previewConsultationTypes = [
    { id: "general", name: "General Ayurvedic Consultation" },
    { id: "follow_up", name: "Follow-up Consultation" }
  ];

  previewConsultationTypes.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    consultationType.appendChild(option);
  });

  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
  preferredDate.min = localToday;

  modeCards.forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    radio.addEventListener("change", () => {
      modeCards.forEach((item) => item.classList.remove("is-selected"));
      card.classList.add("is-selected");
      clearError("consultation_mode");
    });
  });

  phone.addEventListener("input", () => {
    phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
  });

  concern.addEventListener("input", () => {
    count.textContent = String(concern.value.length);
  });

  function errorElement(key) {
    return document.querySelector(`[data-error-for="${key}"]`);
  }

  function setError(key, message) {
    const el = errorElement(key);
    if (el) el.textContent = message;
  }

  function clearError(key) {
    setError(key, "");
  }

  function clearAllErrors() {
    document.querySelectorAll(".field-error").forEach((el) => {
      el.textContent = "";
    });
  }

  function validate() {
    clearAllErrors();
    let valid = true;

    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const age = document.getElementById("age");
    const gender = document.getElementById("gender");
    const mode = form.querySelector('input[name="consultation_mode"]:checked');
    const consent = document.getElementById("consent");

    if (fullName.value.trim().length < 2) {
      setError("fullName", "Please enter the patient name.");
      valid = false;
    }

    if (!/^[6-9]\d{9}$/.test(phone.value)) {
      setError("phone", "Enter a valid 10-digit Indian mobile number.");
      valid = false;
    }

    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setError("email", "Enter a valid email address.");
      valid = false;
    }

    const ageValue = Number(age.value);
    if (!age.value || ageValue < 1 || ageValue > 120) {
      setError("age", "Enter a valid age.");
      valid = false;
    }

    if (!gender.value) {
      setError("gender", "Please select gender.");
      valid = false;
    }

    if (!mode) {
      setError("consultation_mode", "Please choose in-person or online consultation.");
      valid = false;
    }

    if (!consultationType.value) {
      setError("consultationType", "Please select a consultation type.");
      valid = false;
    }

    if (concern.value.trim().length < 5) {
      setError("mainConcern", "Please briefly describe the main concern.");
      valid = false;
    }

    if (!preferredDate.value) {
      setError("preferredDate", "Please choose a preferred date.");
      valid = false;
    } else if (preferredDate.value < localToday) {
      setError("preferredDate", "Preferred date cannot be in the past.");
      valid = false;
    }

    if (!consent.checked) {
      setError("consent", "Please confirm before submitting.");
      valid = false;
    }

    return valid;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validate()) {
      const firstError = [...document.querySelectorAll(".field-error")]
        .find((el) => el.textContent.trim());

      firstError?.closest(".field, .consent-row")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      return;
    }

    // Frontend-only stage. Backend POST will be connected here.
    notice.hidden = false;
    notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  document.getElementById("currentYear").textContent = new Date().getFullYear();

  if (window.lucide) {
    window.lucide.createIcons();
  } else {
    window.addEventListener("load", () => window.lucide?.createIcons());
  }
})();
