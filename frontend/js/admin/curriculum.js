document.addEventListener("DOMContentLoaded", async function () {
  const user = await requireAuth(["admin"]);
  if (!user) {
    return;
  }

  renderAdminSidebar(document.getElementById("admin-sidebar"), "curriculum");

  const state = {
    search: "",
    status: "",
    items: [],
  };

  const tableBody = document.getElementById("curriculum-table-body");
  const searchInput = document.getElementById("curriculum-search");
  const pageAlert = document.getElementById("page-alert");
  const filterChips = document.querySelectorAll(".filter-chip");
  const createModal = document.getElementById("create-modal");
  const createForm = document.getElementById("create-curriculum-form");
  const createAlert = document.getElementById("create-alert");
  const createSubmitBtn = document.getElementById("create-submit-btn");
  const modalTitle = document.getElementById("create-modal-title");
  const editIdInput = document.getElementById("edit-curriculum-id");

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

  function buildPayload(formData, isEdit) {
    const payload = {
      name: formData.get("name"),
      status: formData.get("status"),
    };

    const description = formData.get("description");
    const duration = formData.get("duration_weeks");

    if (isEdit) {
      payload.description = description || null;
      payload.duration_weeks = duration ? Number(duration) : null;
    } else {
      if (description) {
        payload.description = description;
      }
      if (duration) {
        payload.duration_weeks = Number(duration);
      }
    }

    return payload;
  }

  function openCreateModal() {
    hideAlert(createAlert);
    editIdInput.value = "";
    modalTitle.textContent = "Create curriculum";
    createSubmitBtn.textContent = "Create";
    createForm.reset();
    createModal.classList.remove("hidden");
  }

  function openEditModal(item) {
    hideAlert(createAlert);
    editIdInput.value = item.curriculum_id;
    modalTitle.textContent = "Edit curriculum";
    createSubmitBtn.textContent = "Save changes";
    createForm.reset();
    document.getElementById("create-name").value = item.name;
    document.getElementById("create-description").value = item.description || "";
    document.getElementById("create-duration").value = item.duration_weeks || "";
    document.getElementById("create-status").value = item.status;
    createModal.classList.remove("hidden");
  }

  function closeModal() {
    createModal.classList.add("hidden");
    editIdInput.value = "";
  }

  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = '<div class="data-table-empty">No curricula found.</div>';
      return;
    }

    tableBody.innerHTML = items
      .map(function (item) {
        const statusClass = item.status === "published" ? "published" : "draft";
        const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);

        return `
          <div class="data-table-row" data-id="${item.curriculum_id}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(item.name)}">
            <span class="data-table-primary" data-label="Name">${escapeHtml(item.name)}</span>
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

    tableBody.querySelectorAll(".data-table-row").forEach(function (row) {
      const id = row.dataset.id;
      const item = items.find(function (entry) {
        return entry.curriculum_id === id;
      });

      row.addEventListener("click", function () {
        openEditModal(item);
      });

      row.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openEditModal(item);
        }
      });
    });
  }

  async function loadCurricula() {
    hideAlert(pageAlert);
    tableBody.innerHTML = '<div class="data-table-loading">Loading curricula...</div>';

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
      state.items = data.items;
      renderRows(data.items);
    } catch (error) {
      tableBody.innerHTML = "";
      showAlert(pageAlert, error.message);
    }
  }

  bindFilterChips(filterChips, function (chip) {
    state.status = chip.dataset.status || "";
    loadCurricula();
  });

  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () {
      state.search = searchInput.value.trim();
      loadCurricula();
    }, 300);
  });

  document.getElementById("create-curriculum-btn").addEventListener("click", openCreateModal);

  document.getElementById("create-cancel-btn").addEventListener("click", closeModal);

  bindModalDismiss(createModal, closeModal);

  createForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    hideAlert(createAlert);
    createSubmitBtn.disabled = true;

    const formData = new FormData(createForm);
    const curriculumId = editIdInput.value;
    const isEdit = Boolean(curriculumId);
    const payload = buildPayload(formData, isEdit);

    try {
      if (isEdit) {
        await apiFetch(`/curricula/${curriculumId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/curricula/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeModal();
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
