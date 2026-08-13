const FK = {
  API_BASE_URL:
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:8000"
      : "https://api.favorskitchen.com",

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
    { id: "recipes", label: "Recipes", href: "#" },
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
