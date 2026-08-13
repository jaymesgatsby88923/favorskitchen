document.addEventListener("DOMContentLoaded", async function () {
  const user = await requireAuth(["admin"]);
  if (!user) {
    return;
  }

  renderAdminSidebar(document.getElementById("admin-sidebar"), "curriculum");

  const state = {
    search: "",
    status: "",
  };

  const tableBody = document.getElementById("curriculum-table-body");
  const searchInput = document.getElementById("curriculum-search");
  const pageAlert = document.getElementById("page-alert");
  const filterChips = document.querySelectorAll(".filter-chip");
  const createModal = document.getElementById("create-modal");
  const createForm = document.getElementById("create-curriculum-form");
  const createAlert = document.getElementById("create-alert");
  const createSubmitBtn = document.getElementById("create-submit-btn");

  let searchTimeout;

  function formatDuration(weeks) {
    if (!weeks) {
      return "—";
    }
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  function formatStudents(count) {
    if (!count) {
      return "—";
    }
    return String(count);
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = '<div class="curriculum-empty">No curricula found.</div>';
      return;
    }

    tableBody.innerHTML = items
      .map(function (item) {
        const statusClass = item.status === "published" ? "published" : "draft";
        const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);

        return `
          <div class="curriculum-table-row">
            <span class="curriculum-name" data-label="Name">${escapeHtml(item.name)}</span>
            <span data-label="Duration">${formatDuration(item.duration_weeks)}</span>
            <span data-label="Status">
              <span class="status-badge ${statusClass}">${statusLabel}</span>
            </span>
            <span data-label="Students">${formatStudents(item.student_count)}</span>
            <span data-label="Updated">${formatDate(item.updated_at)}</span>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadCurricula() {
    hideAlert(pageAlert);
    tableBody.innerHTML = '<div class="curriculum-loading">Loading curricula...</div>';

    const params = new URLSearchParams();
    if (state.search) {
      params.set("search", state.search);
    }
    if (state.status) {
      params.set("status", state.status);
    }

    const query = params.toString();
    const path = query ? `/curricula/?${query}` : "/curricula/";

    try {
      const data = await apiFetch(path);
      renderRows(data.items);
    } catch (error) {
      tableBody.innerHTML = "";
      showAlert(pageAlert, error.message);
    }
  }

  filterChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      filterChips.forEach(function (c) {
        c.classList.remove("active");
      });
      chip.classList.add("active");
      state.status = chip.dataset.status || "";
      loadCurricula();
    });
  });

  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () {
      state.search = searchInput.value.trim();
      loadCurricula();
    }, 300);
  });

  document.getElementById("create-curriculum-btn").addEventListener("click", function () {
    hideAlert(createAlert);
    createForm.reset();
    createModal.classList.remove("hidden");
  });

  document.getElementById("create-cancel-btn").addEventListener("click", function () {
    createModal.classList.add("hidden");
  });

  createModal.addEventListener("click", function (event) {
    if (event.target === createModal) {
      createModal.classList.add("hidden");
    }
  });

  createForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    hideAlert(createAlert);
    createSubmitBtn.disabled = true;

    const formData = new FormData(createForm);
    const payload = {
      name: formData.get("name"),
      status: formData.get("status"),
    };

    const description = formData.get("description");
    if (description) {
      payload.description = description;
    }

    const duration = formData.get("duration_weeks");
    if (duration) {
      payload.duration_weeks = Number(duration);
    }

    try {
      await apiFetch("/curricula/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      createModal.classList.add("hidden");
      createForm.reset();
      await loadCurricula();
    } catch (error) {
      showAlert(createAlert, error.message);
    } finally {
      createSubmitBtn.disabled = false;
    }
  });

  await loadCurricula();
});
