document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("reset-password-form");
  const alertEl = document.getElementById("form-alert");
  const submitBtn = document.getElementById("reset-submit");
  const hashParams = parseHashParams();

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken || !refreshToken) {
    showAlert(
      alertEl,
      "Invalid or expired reset link. Please request a new one.",
      "error"
    );
    form.classList.add("hidden");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert(alertEl);

    const formData = new FormData(form);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (password !== confirmPassword) {
      showAlert(alertEl, "Passwords do not match.");
      return;
    }

    submitBtn.disabled = true;

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          password: password,
        }),
      });

      showAlert(alertEl, "Password updated! Redirecting to sign in...", "success");
      form.classList.add("hidden");
      setTimeout(function () {
        window.location.href = resolvePath("login.html");
      }, 1500);
    } catch (error) {
      showAlert(alertEl, error.message);
      submitBtn.disabled = false;
    }
  });
});
