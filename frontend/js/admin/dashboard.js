document.addEventListener("DOMContentLoaded", async function () {
  const user = await requireAuth(["admin"]);
  if (!user) {
    return;
  }

  renderAdminSidebar(document.getElementById("admin-sidebar"), "dashboard");

  const welcomeTitle = document.getElementById("welcome-title");
  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome, ${user.first_name}!`;
  }
});
