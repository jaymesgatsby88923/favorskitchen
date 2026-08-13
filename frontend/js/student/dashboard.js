document.addEventListener("DOMContentLoaded", async function () {
  const user = await requireAuth(["student"]);
  if (!user) {
    return;
  }

  const welcomeTitle = document.getElementById("welcome-title");
  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome, ${user.first_name}!`;
  }

  const logoutBtn = document.getElementById("student-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});
