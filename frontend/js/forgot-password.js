document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("forgot-password-form");
  const alertEl = document.getElementById("form-alert");
  const submitBtn = document.getElementById("forgot-submit");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert(alertEl);
    submitBtn.disabled = true;

    const formData = new FormData(form);

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          redirect_to: getResetPasswordUrl(),
        }),
      });

      showAlert(
        alertEl,
        "If an account exists for that email, a reset link has been sent.",
        "success"
      );
      form.reset();
    } catch (error) {
      showAlert(alertEl, error.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
});
