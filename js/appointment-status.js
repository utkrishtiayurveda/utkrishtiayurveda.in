(() => {
  'use strict';

  const API_URL = 'https://test.govjobupdates.com/live-test/ayurveda-api/status.php';
  const form = document.getElementById('trackingForm');
  if (!form) return;

  const appointmentInput = document.getElementById('appointmentNo');
  const mobileInput = document.getElementById('mobile');
  const submitButton = document.getElementById('trackSubmit');
  const message = document.getElementById('trackMessage');
  const result = document.getElementById('appointmentResult');

  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 });

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  function setError(id, text = '') {
    const el = document.querySelector(`[data-error-for="${id}"]`);
    if (el) el.textContent = text;
  }

  function normalizeAppointment(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function normalizeMobile(value) {
    return String(value || '').replace(/\D/g, '').slice(-10);
  }

  function validate() {
    const appointmentNo = normalizeAppointment(appointmentInput.value);
    const mobile = normalizeMobile(mobileInput.value);
    appointmentInput.value = appointmentNo;
    mobileInput.value = mobile;
    setError('appointmentNo');
    setError('mobile');

    let valid = true;
    if (!appointmentNo) {
      setError('appointmentNo', 'Please enter your appointment number.');
      valid = false;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('mobile', 'Enter the 10-digit mobile number used while booking.');
      valid = false;
    }
    return valid ? { appointmentNo, mobile } : null;
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.querySelector('span').textContent = loading ? 'Checking Status...' : 'Track Appointment';
    const icon = submitButton.querySelector('svg');
    if (icon) icon.style.opacity = loading ? '.45' : '1';
  }

  function showMessage(text, type = 'error') {
    message.textContent = text;
    message.classList.toggle('is-info', type === 'info');
    message.hidden = false;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = '';
    message.classList.remove('is-info');
  }

  function formatDate(value) {
    if (!value) return 'Not assigned yet';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function formatTime(value) {
    if (!value) return '';
    const parts = String(value).split(':');
    if (parts.length < 2) return value;
    const d = new Date();
    d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  }

  function labelMode(mode) {
    return mode === 'online' ? 'Online Consultation' : mode === 'in_person' ? 'In-person Consultation' : 'Consultation';
  }

  function labelPayment(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'paid') return 'Paid Online';
    if (normalized === 'partially_refunded') return 'Partly Refunded';
    if (normalized === 'refunded') return 'Refunded';
    if (normalized === 'pending') return 'Payment Pending';
    if (normalized === 'failed') return 'Payment Failed';
    return status ? status.replace(/_/g, ' ') : 'Not available';
  }

  function statusConfig(status, paymentStatus) {
    const paidLike = ['paid', 'partially_refunded', 'refunded'].includes(String(paymentStatus || '').toLowerCase());
    if (!paidLike) {
      return { title: 'Payment Not Completed', description: 'We have not received the online payment for this request, so the clinic has not been notified. If money was deducted, it will be reflected within a few minutes, or please contact the clinic with your payment reference.', pill: 'Payment Pending', icon: 'clock-3', cls: 'is-requested', progress: 0 };
    }
    switch (String(status || '').toLowerCase()) {
      case 'no_show':
        return { title: 'Visit Missed', description: 'The clinic marked this visit as missed. Please contact the clinic if you would like to reschedule.', pill: 'Missed', icon: 'calendar-x-2', cls: 'is-cancelled', progress: 0 };
      case 'confirmed':
        return { title: 'Appointment Confirmed', description: 'Your consultation schedule has been confirmed by the clinic.', pill: 'Confirmed', icon: 'calendar-check-2', cls: 'is-confirmed', progress: 2 };
      case 'completed':
        return { title: 'Consultation Completed', description: 'This appointment has been marked as completed by the clinic.', pill: 'Completed', icon: 'circle-check-big', cls: 'is-completed', progress: 3 };
      case 'cancelled':
        return { title: 'Appointment Cancelled', description: 'This appointment has been cancelled. Please contact the clinic if you need assistance.', pill: 'Cancelled', icon: 'calendar-x-2', cls: 'is-cancelled', progress: 0 };
      default:
        return { title: 'Appointment Requested', description: 'Your request and payment have been received. The clinic will confirm your date and time.', pill: 'Requested', icon: 'clock-3', cls: 'is-requested', progress: 1 };
    }
  }

  function renderProgress(status, progress) {
    const wrap = document.getElementById('appointmentProgress');
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressStatusText');
    const steps = [...document.querySelectorAll('.progress-step')];
    wrap.classList.toggle('is-cancelled', status === 'cancelled' || status === 'no_show');
    steps.forEach((step, index) => {
      step.classList.remove('is-done', 'is-active');
      if (progress > 0 && index + 1 < progress) step.classList.add('is-done');
      if (progress > 0 && index + 1 === progress) step.classList.add('is-active');
    });
    fill.style.width = progress === 1 ? '12%' : progress === 2 ? '50%' : progress === 3 ? '100%' : '0%';
    text.textContent = status === 'cancelled' ? 'Cancelled' : status === 'no_show' ? 'Missed' : progress === 0 ? 'Awaiting payment' : `${progress} of 3`;
  }

  function renderAppointment(a) {
    const status = String(a.status || 'requested').toLowerCase();
    const config = statusConfig(status, a.payment_status);
    const hero = document.getElementById('resultStatusHero');
    hero.className = `result-status-hero ${config.cls}`;
    document.getElementById('statusSymbol').innerHTML = `<i data-lucide="${config.icon}"></i>`;
    document.getElementById('statusTitle').textContent = config.title;
    document.getElementById('statusDescription').textContent = config.description;
    document.getElementById('statusPill').textContent = config.pill;

    document.getElementById('resultPatient').textContent = a.patient_name || 'Patient';
    document.getElementById('resultAppointmentNo').textContent = a.appointment_no || '—';
    document.getElementById('resultConsultation').textContent = a.consultation_name_snapshot || 'Ayurvedic Consultation';
    document.getElementById('resultMode').textContent = labelMode(a.consultation_mode);
    document.getElementById('resultPreferredDate').textContent = a.preferred_time ? `${formatDate(a.preferred_date)} · ${formatTime(a.preferred_time)}` : formatDate(a.preferred_date);
    document.getElementById('resultPaymentStatus').textContent = labelPayment(a.payment_status);

    const total = Number(a.total_fee_paise || 0) / 100;
    const online = Number(a.online_due_paise || 0) / 100;
    const balance = Number(a.clinic_balance_paise || 0) / 100;
    const paymentCard = document.querySelector('.payment-card');
    paymentCard.classList.toggle('is-balance-due', balance > 0);
    const due = Number(a.clinic_due_paise ?? a.clinic_balance_paise ?? 0) / 100;
    const refunded = Number(a.refunded_paise || 0) / 100;
    paymentCard.classList.toggle('is-balance-due', due > 0 && status !== 'cancelled');
    let summary;
    if (!['paid', 'partially_refunded', 'refunded'].includes(String(a.payment_status || '').toLowerCase())) summary = 'No payment received yet';
    else if (balance > 0 && due > 0) summary = `${money.format(online)} paid · ${money.format(due)} due at clinic`;
    else if (balance > 0) summary = `${money.format(total)} paid in full`;
    else summary = `${money.format(total)} paid · No clinic balance`;
    if (refunded > 0) summary += ` · ${money.format(refunded)} refunded`;
    document.getElementById('resultPaymentSummary').textContent = summary;

    // Cancellation reason / refund notes
    document.querySelectorAll('.result-note').forEach((n) => n.remove());
    const notes = [];
    if (status === 'cancelled' && a.cancel_reason) notes.push(`Reason shared by the clinic: ${a.cancel_reason}`);
    if (refunded > 0) notes.push('A refund has been initiated to your original payment method. It usually reaches your account within 5–7 working days.');
    if (notes.length) {
      const note = document.createElement('div'); note.className = 'result-note'; note.textContent = notes.join(' ');
      document.getElementById('appointmentProgress').before(note);
    }

    // Clinic contact details (managed from the admin settings page)
    const c = a.clinic || {};
    const box = document.getElementById('clinicContact'), links = document.getElementById('clinicLinks');
    links.replaceChildren();
    const addLink = (href, text, light) => { const el = document.createElement('a'); el.href = href; el.textContent = text; if (light) el.className = 'is-light'; if (/^https:/.test(href)) { el.target = '_blank'; el.rel = 'noopener'; } links.appendChild(el); };
    const digits = (v) => String(v || '').replace(/[^\d+]/g, '');
    if (c.phone) addLink(`tel:${digits(c.phone)}`, `Call ${c.phone}`);
    if (c.whatsapp) addLink(`https://wa.me/${digits(c.whatsapp).replace(/^\+/, '')}`, 'WhatsApp', true);
    if (c.maps_url && /^https:\/\//i.test(c.maps_url)) addLink(c.maps_url, 'Get directions', true);
    document.getElementById('clinicName').textContent = c.name || 'Utkrishti Ayurveda';
    document.getElementById('clinicAddress').textContent = c.address || '';
    box.hidden = !(c.phone || c.whatsapp || c.maps_url || c.address);

    const confirmed = document.getElementById('confirmedSchedule');
    if ((status === 'confirmed' || status === 'completed') && a.confirmed_date) {
      const dateText = formatDate(a.confirmed_date);
      const timeText = formatTime(a.confirmed_time);
      document.getElementById('confirmedDateTime').textContent = timeText ? `${dateText} · ${timeText}` : dateText;
      document.getElementById('confirmedModeText').textContent = a.consultation_mode === 'online' ? 'Your online consultation schedule is confirmed.' : 'Please arrive a little before your confirmed time.';
      confirmed.hidden = false;
    } else {
      confirmed.hidden = true;
    }

    renderProgress(status, config.progress);
    result.hidden = false;
    refreshIcons();
    requestAnimationFrame(() => result.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function track(appointmentNo, mobile) {
    setLoading(true);
    clearMessage();
    result.hidden = true;
    try {
      const url = new URL(API_URL);
      url.searchParams.set('appointment_no', appointmentNo);
      url.searchParams.set('mobile', mobile);
      const response = await fetch(url.toString(), { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      let data = null;
      try { data = await response.json(); } catch (_) { /* handled below */ }

      if (!response.ok || !data || data.success !== true || !data.appointment) {
        if (response.status === 404) throw new Error('We could not find an appointment matching those details. Please check the Appointment ID and registered mobile number.');
        if (response.status === 422) throw new Error('Please check the Appointment ID and mobile number and try again.');
        throw new Error((data && data.message) || 'We could not check your appointment right now. Please try again shortly.');
      }
      renderAppointment({ ...data.appointment, clinic: data.clinic });
    } catch (error) {
      showMessage(error && error.message ? error.message : 'Unable to check appointment status right now.');
    } finally {
      setLoading(false);
    }
  }

  mobileInput.addEventListener('input', () => { mobileInput.value = normalizeMobile(mobileInput.value); setError('mobile'); });
  appointmentInput.addEventListener('input', () => setError('appointmentNo'));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessage();
    result.hidden = true;
    const values = validate();
    if (!values) return;
    track(values.appointmentNo, values.mobile);
  });

  document.getElementById('copyAppointmentNo').addEventListener('click', async () => {
    const value = document.getElementById('resultAppointmentNo').textContent.trim();
    if (!value || value === '—') return;
    try {
      await navigator.clipboard.writeText(value);
      const copy = document.getElementById('copyAppointmentNo');
      const span = copy.querySelector('span');
      span.textContent = 'Copied';
      setTimeout(() => { span.textContent = 'Copy'; }, 1600);
    } catch (_) { /* clipboard may be unavailable */ }
  });

  const params = new URLSearchParams(window.location.search);
  const appointmentFromUrl = normalizeAppointment(params.get('appointment_no'));
  if (appointmentFromUrl) appointmentInput.value = appointmentFromUrl;

  refreshIcons();
})();
