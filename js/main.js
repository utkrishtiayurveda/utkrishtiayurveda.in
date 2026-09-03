(() => {
  const header = document.getElementById('siteHeader');
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const year = document.getElementById('currentYear');

  // Floating pill header behaviour:
  // - visible at the top
  // - hides while scrolling down
  // - returns as soon as the user scrolls up
  // - never hides while the mobile menu is open
  let lastScrollY = Math.max(window.scrollY, 0);
  let ticking = false;
  const HIDE_AFTER = 120;
  const DOWN_TOLERANCE = 5;
  const UP_TOLERANCE = 2;

  const updateHeader = () => {
    if (!header) return;

    const currentScrollY = Math.max(window.scrollY, 0);
    const delta = currentScrollY - lastScrollY;
    const menuIsOpen = menuToggle?.getAttribute('aria-expanded') === 'true';

    header.classList.toggle('scrolled', currentScrollY > 18);

    if (menuIsOpen || currentScrollY <= HIDE_AFTER) {
      header.classList.remove('header-hidden');
    } else if (delta > DOWN_TOLERANCE) {
      header.classList.add('header-hidden');
    } else if (delta < -UP_TOLERANCE) {
      header.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  };

  updateHeader();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      const nextOpen = !open;

      menuToggle.setAttribute('aria-expanded', String(nextOpen));
      mobileMenu.hidden = open;
      menuToggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      menuToggle.innerHTML = open ? '<i data-lucide="menu"></i>' : '<i data-lucide="x"></i>';

      if (header) {
        header.classList.toggle('menu-open', nextOpen);
        header.classList.remove('header-hidden');
      }

      if (window.lucide) lucide.createIcons();
    });

    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      mobileMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
      menuToggle.innerHTML = '<i data-lucide="menu"></i>';
      header?.classList.remove('menu-open');
      if (window.lucide) lucide.createIcons();
    }));
  }

  // If someone tabs into the header, make sure it is visible.
  header?.addEventListener('focusin', () => header.classList.remove('header-hidden'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  if (year) year.textContent = new Date().getFullYear();

  const initIcons = () => { if (window.lucide) lucide.createIcons(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initIcons);
  else initIcons();
})();
