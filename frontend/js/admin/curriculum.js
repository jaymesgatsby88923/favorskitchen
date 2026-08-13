document.addEventListener("DOMContentLoaded", async function () {
  const user = await requireAuth(["admin"]);
  if (!user) {
    return;
  }

  renderAdminSidebar(document.getElementById("admin-sidebar"), "curriculum");

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.textContent = "Curriculum";
  }
});
