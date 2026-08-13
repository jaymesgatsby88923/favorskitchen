document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("register-form");
  const alertEl = document.getElementById("form-alert");
  const submitBtn = document.getElementById("register-submit");

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

    const phone = formData.get("phone");
    const payload = {
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      email: formData.get("email"),
      password: password,
    };

    if (phone) {
      payload.phone = phone;
    }

    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showAlert(alertEl, "Account created! You can sign in now.", "success");
      form.reset();
      setTimeout(function () {
        window.location.href = "login.html";
      }, 1200);
    } catch (error) {
      showAlert(alertEl, error.message);
      submitBtn.disabled = false;
    }
  });
});
