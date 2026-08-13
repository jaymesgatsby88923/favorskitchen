const FK = {
  API_BASE_URL: window.FK_CONFIG.API_BASE_URL,
  ACCESS_TOKEN_KEY: "fk_access_token",
  REFRESH_TOKEN_KEY: "fk_refresh_token",
};

function getAccessToken() {
  return localStorage.getItem(FK.ACCESS_TOKEN_KEY);
}

function setSession(tokens) {
  localStorage.setItem(FK.ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(FK.REFRESH_TOKEN_KEY, tokens.refresh_token);
}

function clearSession() {
  localStorage.removeItem(FK.ACCESS_TOKEN_KEY);
  localStorage.removeItem(FK.REFRESH_TOKEN_KEY);
}

function logout() {
  clearSession();
  window.location.href = resolvePath("login.html");
}

function resolvePath(relativePath) {
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const inSubdir =
    window.location.pathname.includes("/admin/") ||
    window.location.pathname.includes("/student/");
  if (!inSubdir) {
    return relativePath;
  }
  return `../${relativePath}`;
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${FK.API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  }

  if (response.status === 401 && !path.includes("/auth/login")) {
    clearSession();
  }

  if (!response.ok) {
    const message = (data && data.detail) || "Something went wrong";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data;
}

async function getCurrentUser() {
  return apiFetch("/auth/me");
}

function redirectAfterLogin(user) {
  if (user.role === "admin") {
    window.location.href = resolvePath("admin/dashboard.html");
    return;
  }
  if (user.role === "student") {
    window.location.href = resolvePath("student/dashboard.html");
    return;
  }
  throw new Error("Your account role is not supported yet.");
}

async function requireAuth(allowedRoles) {
  if (!getAccessToken()) {
    window.location.href = resolvePath("login.html");
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!allowedRoles.includes(user.role)) {
      redirectAfterLogin(user);
      return null;
    }
    return user;
  } catch (error) {
    clearSession();
    window.location.href = resolvePath("login.html");
    return null;
  }
}

function getLogoSvg(strokeMain = "#6b2c32", strokeAccent = "#c9a24a") {
  return `<svg class="logo-mark" viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="72" rx="34" ry="10" fill="none" stroke="${strokeMain}" stroke-width="2"/>
    <path d="M22 58 Q22 28 50 28 Q78 28 78 58" fill="none" stroke="${strokeMain}" stroke-width="2"/>
    <path d="M35 28 Q35 8 50 8 Q65 8 65 28" fill="none" stroke="${strokeMain}" stroke-width="2"/>
    <path d="M44 48 C46 54 54 54 56 48" fill="none" stroke="${strokeAccent}" stroke-width="2"/>
    <path d="M50 42 V48" stroke="${strokeAccent}" stroke-width="2"/>
  </svg>`;
}

function renderBrandHeader(container) {
  container.innerHTML = `
    ${getLogoSvg()}
    <div class="brand-name">Favor's Kitchen</div>
    <div class="brand-tagline">COOK • LEARN • ENJOY</div>
  `;
}

function renderAdminSidebar(container, activePage) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", href: "dashboard.html" },
    { id: "curriculum", label: "Curriculum", href: "curriculum.html" },
    { id: "recipes", label: "Recipes", href: "recipes.html" },
    { id: "classes", label: "Classes", href: "#" },
    { id: "students", label: "Students", href: "#" },
  ];

  const navLinks = navItems
    .map(
      (item) =>
        `<a href="${item.href}" class="${item.id === activePage ? "active" : ""}">${item.label}</a>`
    )
    .join("");

  container.innerHTML = `
    <div class="sidebar-brand">
      ${getLogoSvg("#e2c06a", "#c9a24a")}
      <div class="brand-name">Favor's Kitchen</div>
      <div class="brand-tagline">COOK • LEARN • ENJOY</div>
    </div>
    <nav class="sidebar-nav" aria-label="Admin navigation">${navLinks}</nav>
    <div class="sidebar-footer">
      <a href="#">Settings</a>
      <button type="button" id="logout-btn">Log out</button>
    </div>
  `;

  const logoutBtn = container.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

function showAlert(container, message, type = "error") {
  container.textContent = message;
  container.className = `alert alert-${type}`;
  container.classList.remove("hidden");
}

function hideAlert(container) {
  container.classList.add("hidden");
  container.textContent = "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMinutes(minutes) {
  if (!minutes) {
    return "—";
  }
  return `${minutes} min`;
}

function debounce(fn, delay) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function () {
      fn.apply(this, args);
    }, delay);
  };
}

function bindModalDismiss(overlay, closeFn) {
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeFn();
    }
  });
}

function bindFilterChips(chips, onChange) {
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (entry) {
        entry.classList.remove("active");
      });
      chip.classList.add("active");
      onChange(chip);
    });
  });
}

function initIngredientCombobox(root) {
  const input = root.querySelector(".ingredient-combobox-input");
  const menu = root.querySelector(".ingredient-combobox-menu");
  const idInput = root.querySelector(".ingredient-combobox-id");
  let selected = { ingredient_id: "", name: "" };

  function closeMenu() {
    menu.classList.add("hidden");
  }

  function openMenu() {
    menu.classList.remove("hidden");
  }

  function setSelection(nextSelection) {
    selected = {
      ingredient_id: nextSelection.ingredient_id || "",
      name: nextSelection.name || "",
    };
    idInput.value = selected.ingredient_id;
    input.value = selected.name;
    closeMenu();
  }

  function clearSelection() {
    selected = { ingredient_id: "", name: "" };
    idInput.value = "";
    input.value = "";
    menu.innerHTML = "";
    closeMenu();
  }

  function renderMenu(items, query) {
    const trimmedQuery = query.trim();
    let html = "";

    if (!trimmedQuery) {
      menu.innerHTML = '<div class="ingredient-combobox-empty">Type to search ingredients</div>';
      openMenu();
      return;
    }

    if (items.length) {
      html += items
        .map(function (item) {
          const category = item.category
            ? `<span class="ingredient-combobox-option-meta">${escapeHtml(item.category)}</span>`
            : "";
          return `
            <button type="button" class="ingredient-combobox-option" data-id="${item.ingredient_id}">
              <span class="ingredient-combobox-option-name">${escapeHtml(item.name)}</span>
              ${category}
            </button>
          `;
        })
        .join("");
    } else {
      html += '<div class="ingredient-combobox-empty">No matches found</div>';
    }

    html += `
      <button type="button" class="ingredient-combobox-create" data-create="true">
        + Create "${escapeHtml(trimmedQuery)}"
      </button>
    `;

    menu.innerHTML = html;
    openMenu();

    menu.querySelectorAll(".ingredient-combobox-option").forEach(function (option) {
      option.addEventListener("click", function () {
        setSelection({
          ingredient_id: option.dataset.id,
          name: option.querySelector(".ingredient-combobox-option-name").textContent,
        });
      });
    });

    const createButton = menu.querySelector(".ingredient-combobox-create");
    if (createButton) {
      createButton.addEventListener("click", async function () {
        try {
          createButton.disabled = true;
          const created = await apiFetch("/ingredients/", {
            method: "POST",
            body: JSON.stringify({ name: trimmedQuery }),
          });
          setSelection({
            ingredient_id: created.ingredient_id,
            name: created.name,
          });
        } catch (error) {
          menu.innerHTML = `<div class="ingredient-combobox-empty">${escapeHtml(error.message)}</div>`;
          openMenu();
        }
      });
    }
  }

  const searchIngredients = debounce(async function () {
    const query = input.value.trim();
    selected = { ingredient_id: "", name: query };
    idInput.value = "";

    if (!query) {
      menu.innerHTML = "";
      closeMenu();
      return;
    }

    menu.innerHTML = '<div class="ingredient-combobox-loading">Searching...</div>';
    openMenu();

    try {
      const params = new URLSearchParams({ search: query, limit: "20" });
      const data = await apiFetch(`/ingredients/?${params.toString()}`);
      renderMenu(data.items, query);
    } catch (error) {
      menu.innerHTML = `<div class="ingredient-combobox-empty">${escapeHtml(error.message)}</div>`;
      openMenu();
    }
  }, 300);

  input.addEventListener("input", searchIngredients);
  input.addEventListener("focus", function () {
    if (input.value.trim()) {
      searchIngredients();
    }
  });

  document.addEventListener("click", function (event) {
    if (!root.contains(event.target)) {
      closeMenu();
    }
  });

  return {
    getSelection: function () {
      return {
        ingredient_id: idInput.value || null,
        name: input.value.trim() || null,
      };
    },
    setSelection: setSelection,
    clear: clearSelection,
  };
}

function getResetPasswordUrl() {
  const relative = resolvePath("reset-password.html");
  const basePath = window.location.pathname.replace(/[^/]+$/, "");
  return `${window.location.origin}${basePath}${relative.replace(/^\.\.\//, "")}`;
}

function parseHashParams() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}
