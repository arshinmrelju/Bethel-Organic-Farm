/** Tiny interaction to demonstrate the button loading state on the preview page. */
const loadingButtons = document.querySelectorAll("[data-demo-loading]");
const statusMessage = document.querySelector("#demo-status");

loadingButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("is-loading")) return;

    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    button.disabled = true;

    window.setTimeout(() => {
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      button.disabled = false;

      if (statusMessage) {
        statusMessage.textContent = "Loading state demonstrated. No booking action was performed.";
        statusMessage.dataset.tone = "success";
      }
    }, 1200);
  });
});
