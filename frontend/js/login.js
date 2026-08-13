document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("login-form");
  const alertEl = document.getElementById("form-alert");
  const submitBtn = document.getElementById("login-submit");

  if (getAccessToken()) {
    getCurrentUser()
      .then(redirectAfterLogin)
      .catch(clearSession);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert(alertEl);
    submitBtn.disabled = true;

    const formData = new FormData(form);

    try {
      const tokens = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      setSession(tokens);
      const user = await getCurrentUser();
      redirectAfterLogin(user);
    } catch (error) {
      showAlert(alertEl, error.message);
      submitBtn.disabled = false;
    }
  });
});
