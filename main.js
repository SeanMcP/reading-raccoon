const bubbleEl = document.getElementById("bubble");

document.addEventListener("submit", (event) => {
  const target = event.target;

  if (target.id === "form") {
    event.preventDefault();
    const fd = new FormData(target);
    const input = fd.get("input");

    if (input) {
      const utterance = new SpeechSynthesisUtterance(input);
      speechSynthesis.speak(utterance);

      document.body.dataset.input = input.toLowerCase();
      bubbleEl.removeAttribute("hidden");
      bubbleEl.textContent = input;
    } else {
      bubbleEl.hidden = true;
    }

    target.reset();
  }
});
