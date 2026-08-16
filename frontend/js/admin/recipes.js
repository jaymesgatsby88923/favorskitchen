document.addEventListener("DOMContentLoaded", async function () {
  const user = await requireAuth(["admin"]);
  if (!user) {
    return;
  }

  renderAdminSidebar(document.getElementById("admin-sidebar"), "recipes");

  const state = {
    search: "",
    status: "",
    active: "",
    items: [],
  };

  const tableBody = document.getElementById("recipe-table-body");
  const searchInput = document.getElementById("recipe-search");
  const pageAlert = document.getElementById("page-alert");
  const statusChips = document.querySelectorAll('[data-filter="status"]');
  const activeChips = document.querySelectorAll('[data-filter="active"]');
  const recipeModal = document.getElementById("recipe-modal");
  const recipeForm = document.getElementById("recipe-form");
  const recipeAlert = document.getElementById("recipe-alert");
  const recipeSubmitBtn = document.getElementById("recipe-submit-btn");
  const recipeModalTitle = document.getElementById("recipe-modal-title");
  const editIdInput = document.getElementById("edit-recipe-id");
  const deleteRecipeBtn = document.getElementById("delete-recipe-btn");
  const ingredientRows = document.getElementById("ingredient-rows");
  const ingredientRowTemplate = document.getElementById("ingredient-row-template");
  const stepRows = document.getElementById("step-rows");
  const stepRowTemplate = document.getElementById("step-row-template");

  const comboboxControllers = new Map();
  let searchTimeout;

  function optionalNumber(value) {
    if (value === "" || value == null) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function optionalString(value) {
    const trimmed = (value || "").trim();
    return trimmed || null;
  }

  function statusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function destroyComboboxes() {
    comboboxControllers.clear();
  }

  function refreshStepNumbers() {
    stepRows.querySelectorAll(".step-row").forEach(function (row, index) {
      row.querySelector(".step-row-number").textContent = String(index + 1);
      const upBtn = row.querySelector(".step-row-up");
      const downBtn = row.querySelector(".step-row-down");
      upBtn.disabled = index === 0;
      downBtn.disabled = index === stepRows.querySelectorAll(".step-row").length - 1;
    });
  }

  function addStepRow(line) {
    const fragment = stepRowTemplate.content.cloneNode(true);
    stepRows.appendChild(fragment);
    const mountedRow = stepRows.lastElementChild;

    if (line) {
      mountedRow.querySelector(".step-row-description").value = line.description || "";
    }

    mountedRow.querySelector(".step-row-up").addEventListener("click", function () {
      const previous = mountedRow.previousElementSibling;
      if (previous) {
        stepRows.insertBefore(mountedRow, previous);
        refreshStepNumbers();
      }
    });

    mountedRow.querySelector(".step-row-down").addEventListener("click", function () {
      const next = mountedRow.nextElementSibling;
      if (next) {
        stepRows.insertBefore(next, mountedRow);
        refreshStepNumbers();
      }
    });

    mountedRow.querySelector(".step-row-remove").addEventListener("click", function () {
      mountedRow.remove();
      refreshStepNumbers();
    });

    refreshStepNumbers();
  }

  function resetStepRows(lines) {
    stepRows.innerHTML = "";
    if (lines && lines.length) {
      lines.forEach(addStepRow);
    }
  }

  function collectStepPayload() {
    const rows = stepRows.querySelectorAll(".step-row");
    const steps = [];

    rows.forEach(function (row, index) {
      const description = optionalString(row.querySelector(".step-row-description").value);
      if (!description) {
        return;
      }

      steps.push({
        description: description,
        sort_order: index,
      });
    });

    return steps;
  }

  function addIngredientRow(line) {
    const fragment = ingredientRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".ingredient-row");
    ingredientRows.appendChild(fragment);
    const mountedRow = ingredientRows.lastElementChild;
    const comboboxRoot = mountedRow.querySelector("[data-ingredient-combobox]");
    const controller = initIngredientCombobox(comboboxRoot);
    comboboxControllers.set(mountedRow, controller);

    if (line) {
      controller.setSelection({
        ingredient_id: line.ingredient_id,
        name: line.name,
      });
      mountedRow.querySelector(".ingredient-qty").value = line.quantity ?? "";
      mountedRow.querySelector(".ingredient-unit").value = line.unit || "";
      mountedRow.querySelector(".ingredient-prep").value = line.preparation || "";
      mountedRow.querySelector(".ingredient-notes").value = line.notes || "";
    }

    mountedRow.querySelector(".ingredient-row-remove").addEventListener("click", function () {
      comboboxControllers.delete(mountedRow);
      mountedRow.remove();
    });
  }

  function resetIngredientRows(lines) {
    destroyComboboxes();
    ingredientRows.innerHTML = "";
    if (lines && lines.length) {
      lines.forEach(addIngredientRow);
    } else {
      addIngredientRow();
    }
  }

  function collectIngredientPayload() {
    const rows = ingredientRows.querySelectorAll(".ingredient-row");
    const ingredients = [];

    rows.forEach(function (row, index) {
      const controller = comboboxControllers.get(row);
      const selection = controller.getSelection();
      const quantityValue = row.querySelector(".ingredient-qty").value;
      const line = {
        quantity: quantityValue === "" ? null : Number(quantityValue),
        unit: optionalString(row.querySelector(".ingredient-unit").value),
        preparation: optionalString(row.querySelector(".ingredient-prep").value),
        notes: optionalString(row.querySelector(".ingredient-notes").value),
        sort_order: index,
      };

      if (selection.ingredient_id) {
        line.ingredient_id = selection.ingredient_id;
      } else if (selection.name) {
        line.name = selection.name;
      } else {
        return;
      }

      ingredients.push(line);
    });

    return ingredients;
  }

  function buildPayload(formData, isEdit) {
    const payload = {
      name: formData.get("name"),
      status: formData.get("status"),
      active: document.getElementById("recipe-active").checked,
      ingredients: collectIngredientPayload(),
      steps: collectStepPayload(),
    };

    const fields = {
      description: formData.get("description"),
      prep_time_minutes: formData.get("prep_time_minutes"),
      cook_time_minutes: formData.get("cook_time_minutes"),
      servings: formData.get("servings"),
      image_url: formData.get("image_url"),
      pdf_url: formData.get("pdf_url"),
    };

    Object.keys(fields).forEach(function (key) {
      const value = fields[key];
      if (key.endsWith("_minutes") || key === "servings") {
        const parsed = optionalNumber(value);
        if (isEdit || parsed != null) {
          payload[key] = parsed;
        }
        return;
      }

      const parsed = optionalString(value);
      if (isEdit || parsed != null) {
        payload[key] = parsed;
      }
    });

    return payload;
  }

  function openCreateModal() {
    hideAlert(recipeAlert);
    editIdInput.value = "";
    recipeModalTitle.textContent = "Create recipe";
    recipeSubmitBtn.textContent = "Create";
    deleteRecipeBtn.classList.add("hidden");
    recipeForm.reset();
    document.getElementById("recipe-active").checked = true;
    resetStepRows();
    resetIngredientRows();
    recipeModal.classList.remove("hidden");
  }

  async function openEditModal(listItem) {
    hideAlert(recipeAlert);
    editIdInput.value = listItem.recipe_id;
    recipeModalTitle.textContent = "Edit recipe";
    recipeSubmitBtn.textContent = "Save changes";
    deleteRecipeBtn.classList.remove("hidden");
    recipeForm.reset();
    recipeModal.classList.remove("hidden");
    recipeSubmitBtn.disabled = true;

    try {
      const recipe = await apiFetch(`/recipes/${listItem.recipe_id}`);
      document.getElementById("recipe-name").value = recipe.name;
      document.getElementById("recipe-description").value = recipe.description || "";
      document.getElementById("recipe-prep").value = recipe.prep_time_minutes ?? "";
      document.getElementById("recipe-cook").value = recipe.cook_time_minutes ?? "";
      document.getElementById("recipe-servings").value = recipe.servings ?? "";
      document.getElementById("recipe-image-url").value = recipe.image_url || "";
      document.getElementById("recipe-pdf-url").value = recipe.pdf_url || "";
      document.getElementById("recipe-status").value = recipe.status;
      document.getElementById("recipe-active").checked = recipe.active;
      resetStepRows(recipe.steps);
      resetIngredientRows(recipe.ingredients);
    } catch (error) {
      closeModal();
      showAlert(pageAlert, error.message);
    } finally {
      recipeSubmitBtn.disabled = false;
    }
  }

  function closeModal() {
    recipeModal.classList.add("hidden");
    editIdInput.value = "";
    destroyComboboxes();
    ingredientRows.innerHTML = "";
    stepRows.innerHTML = "";
  }

  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = '<div class="data-table-empty">No recipes found.</div>';
      return;
    }

    tableBody.innerHTML = items
      .map(function (item) {
        const statusClass = item.status === "published" ? "published" : "draft";
        const activeClass = item.active ? "active" : "inactive";
        const activeLabel = item.active ? "Active" : "Inactive";

        return `
          <div class="data-table-row" data-id="${item.recipe_id}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(item.name)}">
            <span class="data-table-primary" data-label="Name">${escapeHtml(item.name)}</span>
            <span data-label="Prep">${formatMinutes(item.prep_time_minutes)}</span>
            <span data-label="Cook">${formatMinutes(item.cook_time_minutes)}</span>
            <span data-label="Servings">${item.servings ?? "—"}</span>
            <span data-label="Status">
              <span class="status-badge ${statusClass}">${statusLabel(item.status)}</span>
            </span>
            <span data-label="Active">
              <span class="status-badge ${activeClass}">${activeLabel}</span>
            </span>
            <span data-label="Updated">${formatDate(item.updated_at)}</span>
          </div>
        `;
      })
      .join("");

    tableBody.querySelectorAll(".data-table-row").forEach(function (row) {
      const id = row.dataset.id;
      const item = items.find(function (entry) {
        return entry.recipe_id === id;
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

  async function loadRecipes() {
    hideAlert(pageAlert);
    tableBody.innerHTML = '<div class="data-table-loading">Loading recipes...</div>';

    const params = new URLSearchParams();
    if (state.search) {
      params.set("search", state.search);
    }
    if (state.status) {
      params.set("status", state.status);
    }
    if (state.active) {
      params.set("active", state.active);
    }

    const query = params.toString();
    const path = query ? `/recipes/?${query}` : "/recipes/";

    try {
      const data = await apiFetch(path);
      state.items = data.items;
      renderRows(data.items);
    } catch (error) {
      tableBody.innerHTML = "";
      showAlert(pageAlert, error.message);
    }
  }

  bindFilterChips(statusChips, function (chip) {
    state.status = chip.dataset.value || "";
    loadRecipes();
  });

  bindFilterChips(activeChips, function (chip) {
    state.active = chip.dataset.value || "";
    loadRecipes();
  });

  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () {
      state.search = searchInput.value.trim();
      loadRecipes();
    }, 300);
  });

  document.getElementById("create-recipe-btn").addEventListener("click", openCreateModal);
  document.getElementById("recipe-cancel-btn").addEventListener("click", closeModal);
  document.getElementById("add-step-row-btn").addEventListener("click", function () {
    addStepRow();
  });
  document.getElementById("add-ingredient-row-btn").addEventListener("click", function () {
    addIngredientRow();
  });
  bindModalDismiss(recipeModal, closeModal);

  deleteRecipeBtn.addEventListener("click", async function () {
    const recipeId = editIdInput.value;
    if (!recipeId) {
      return;
    }

    const confirmed = window.confirm("Delete this recipe? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    hideAlert(recipeAlert);
    deleteRecipeBtn.disabled = true;

    try {
      await apiFetch(`/recipes/${recipeId}`, { method: "DELETE" });
      closeModal();
      await loadRecipes();
    } catch (error) {
      showAlert(recipeAlert, error.message);
    } finally {
      deleteRecipeBtn.disabled = false;
    }
  });

  recipeForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    hideAlert(recipeAlert);
    recipeSubmitBtn.disabled = true;

    const formData = new FormData(recipeForm);
    const recipeId = editIdInput.value;
    const isEdit = Boolean(recipeId);
    const payload = buildPayload(formData, isEdit);

    try {
      if (isEdit) {
        await apiFetch(`/recipes/${recipeId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/recipes/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeModal();
      recipeForm.reset();
      await loadRecipes();
    } catch (error) {
      showAlert(recipeAlert, error.message);
    } finally {
      recipeSubmitBtn.disabled = false;
    }
  });

  await loadRecipes();
});
