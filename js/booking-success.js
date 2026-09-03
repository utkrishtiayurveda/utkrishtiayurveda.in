/* Utkrishti Ayurveda — booking success enhancement.
   Loads after book-appointment.js and upgrades only the final success state. */
(() => {
  "use strict";

  const notice = document.getElementById("frontendNotice");
  if (!notice) return;

  let lastAppointmentNo = "";

  const escapeHtml = (value) => String(value || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function enhanceSuccess() {
    if (notice.dataset.state !== "success" || notice.dataset.enhanced === "1") return;

    const text = notice.textContent || "";
    const match = text.match(/\bUA-[A-Z0-9-]+\b/i);
    if (!match) return;

    lastAppointmentNo = match[0];
    const safeNo = escapeHtml(lastAppointmentNo);

    notice.dataset.enhanced = "1";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.innerHTML = `
      <div class="booking-success-content">
        <strong class="booking-success-title">Appointment Request Submitted Successfully</strong>
        <span class="booking-success-subtitle">Your payment has been verified and your appointment request has been received by Utkrishti Ayurveda.</span>

        <div class="booking-success-number">
          <small>Your Appointment Number</small>
          <strong>${safeNo}</strong>
        </div>

        <span class="booking-success-status">Awaiting clinic confirmation</span>

        <p class="booking-success-note">
          Please save this appointment number. You will need it along with your mobile number to track the appointment.
        </p>

        <div class="booking-success-actions">
          <a class="btn btn-primary booking-track-btn" href="appointment-status.html">Track Appointment</a>
          <button class="btn btn-ghost booking-copy-btn" type="button">Copy Appointment No.</button>
        </div>
      </div>`;

    const copy = notice.querySelector(".booking-copy-btn");
    copy?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(lastAppointmentNo);
        copy.textContent = "Copied ✓";
        window.setTimeout(() => { copy.textContent = "Copy Appointment No."; }, 1800);
      } catch {
        copy.textContent = lastAppointmentNo;
      }
    });

    notice.scrollIntoView({behavior:"smooth", block:"center"});
  }

  new MutationObserver(enhanceSuccess).observe(notice, {
    childList:true, subtree:true, attributes:true, attributeFilter:["data-state","hidden"]
  });
  enhanceSuccess();
})();