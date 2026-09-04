(function () {
  "use strict";

  const posts = Array.isArray(window.UTKRISHTI_BLOGS) ? [...window.UTKRISHTI_BLOGS] : [];
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (ch) {
      return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[ch];
    });
  }

  function renderIndex() {
    const grid = document.querySelector("[data-blog-grid]");
    if (!grid) return;

    const perPage = 9;
    const params = new URLSearchParams(location.search);
    const requested = parseInt(params.get("page") || "1", 10);
    const totalPages = Math.max(1, Math.ceil(posts.length / perPage));
    const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;
    const start = (page - 1) * perPage;
    const current = posts.slice(start, start + perPage);

    if (!current.length) {
      grid.innerHTML = '<div class="blog-empty"><h2>No articles yet</h2><p>New Ayurveda journal articles will appear here.</p></div>';
    } else {
      grid.innerHTML = current.map(function (post) {
        return `
          <article class="blog-card">
            <a class="blog-art" href="${esc(post.url)}" aria-label="Read ${esc(post.title)}">
              <span class="art-icon"><i data-lucide="${esc(post.icon || "book-open")}"></i></span>
              <span>${esc(post.category)}</span>
            </a>
            <div class="blog-card-body">
              <div class="post-meta">
                <span>${esc(post.dateLabel)}</span>
                <span>${esc(post.readTime)}</span>
              </div>
              <h2><a href="${esc(post.url)}">${esc(post.title)}</a></h2>
              <p>${esc(post.excerpt)}</p>
              <a class="read-link" href="${esc(post.url)}">Read article <i data-lucide="arrow-right"></i></a>
            </div>
          </article>`;
      }).join("");
    }

    const nav = document.querySelector("[data-blog-pagination]");
    if (nav) {
      if (totalPages <= 1) {
        nav.innerHTML = '<a class="page active" href="index.html" aria-current="page">1</a>';
      } else {
        let items = "";
        if (page > 1) {
          items += `<a class="page page-arrow" href="?page=${page - 1}" aria-label="Previous page"><i data-lucide="chevron-left"></i></a>`;
        }
        for (let i = 1; i <= totalPages; i++) {
          items += `<a class="page${i === page ? " active" : ""}" href="${i === 1 ? "index.html" : "?page="+i}"${i === page ? ' aria-current="page"' : ""}>${i}</a>`;
        }
        if (page < totalPages) {
          items += `<a class="page page-arrow" href="?page=${page + 1}" aria-label="Next page"><i data-lucide="chevron-right"></i></a>`;
        }
        nav.innerHTML = items;
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function renderLatestOnArticle() {
    const box = document.querySelector("[data-latest-posts]");
    if (!box) return;

    const currentSlug = document.body.dataset.blogSlug || "";
    let latest = posts.filter(p => p.slug !== currentSlug).slice(0, 3);

    if (!latest.length) {
      box.innerHTML = `
        <article class="related-card current">
          <span>Utkrishti Ayurveda Journal</span>
          <h3>More health articles are being prepared.</h3>
          <small>Check the journal again for new posts.</small>
        </article>`;
      return;
    }

    box.innerHTML = latest.map(function (post) {
      return `
        <article class="related-card">
          <span>${esc(post.category)}</span>
          <h3><a href="${esc(post.url)}">${esc(post.title)}</a></h3>
          <small>${esc(post.dateLabel)} · ${esc(post.readTime)}</small>
        </article>`;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderIndex();
    renderLatestOnArticle();
  });
})();
