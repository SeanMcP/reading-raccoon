const bubbleEl = document.getElementById("bubble");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const buttonEl = formEl.querySelector("button");
const betterTtsEl = document.getElementById("better-tts");

function browserSpeak(text) {
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// Imported dynamically so the app still works if the model fails to load.
const ttsReady = import("./tts.js");
// Failures are handled in speak(); this stops an "Uncaught (in promise)" error.
ttsReady.catch(() => {});

// Play Web Audio even when the iPhone mute switch is on, like browser speech.
if (navigator.audioSession) navigator.audioSession.type = "playback";

let audioContext;

async function speak(text) {
  try {
    const tts = await ttsReady;
    await tts.speak(text, audioContext);
  } catch (error) {
    console.error("Voice model failed, using browser speech", error);
    browserSpeak(text);
  }
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = new FormData(formEl).get("input");
  formEl.reset();

  if (!input) {
    bubbleEl.hidden = true;
    return;
  }

  document.body.dataset.input = input.toLowerCase();

  if (!betterTtsEl.checked) {
    browserSpeak(input);
    bubbleEl.hidden = false;
    bubbleEl.textContent = input;
    return;
  }

  // Browsers only allow audio to start during a click, so create this first.
  audioContext ??= new AudioContext();
  // Wakes audio back up after the phone locks or the tab is in the background.
  audioContext.resume();

  inputEl.disabled = buttonEl.disabled = true;
  bubbleEl.hidden = false;
  bubbleEl.textContent = "...";

  // Let the browser draw the loading state before speech generation keeps it busy.
  await new Promise((resolve) => setTimeout(resolve, 50));
  await speak(input);

  bubbleEl.textContent = input;
  inputEl.disabled = buttonEl.disabled = false;
  inputEl.focus();
});
