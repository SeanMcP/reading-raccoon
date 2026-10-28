// Offline text-to-speech with Kokoro-82M (q8).
// Text handling mirrors kokoro-js 1.2.1 (github.com/hexgrad/kokoro, Apache-2.0).
// Everything loads from this site: no requests to other servers.

import * as ort from "./vendor/onnxruntime-web/ort.wasm.min.mjs";
import { phonemize } from "./vendor/phonemizer/phonemizer.js";

const MODEL_DIR = "./models/kokoro-82m";
const VOICE = "am_puck";
const SPEED = 1;
const SAMPLE_RATE = 24000;
const STYLE_SIZE = 256;
const MAX_PHONEMES = 510; // The model accepts 512 tokens, including start and end.

// From the model's tokenizer.json. Characters not listed are dropped.
const VOCAB = {"$":0,";":1,":":2,",":3,".":4,"!":5,"?":6,"—":9,"…":10,"\"":11,"(":12,")":13,"“":14,"”":15," ":16,"̃":17,"ʣ":18,"ʥ":19,"ʦ":20,"ʨ":21,"ᵝ":22,"ꭧ":23,"A":24,"I":25,"O":31,"Q":33,"S":35,"T":36,"W":39,"Y":41,"ᵊ":42,"a":43,"b":44,"c":45,"d":46,"e":47,"f":48,"h":50,"i":51,"j":52,"k":53,"l":54,"m":55,"n":56,"o":57,"p":58,"q":59,"r":60,"s":61,"t":62,"u":63,"v":64,"w":65,"x":66,"y":67,"z":68,"ɑ":69,"ɐ":70,"ɒ":71,"æ":72,"β":75,"ɔ":76,"ɕ":77,"ç":78,"ɖ":80,"ð":81,"ʤ":82,"ə":83,"ɚ":85,"ɛ":86,"ɜ":87,"ɟ":90,"ɡ":92,"ɥ":99,"ɨ":101,"ɪ":102,"ʝ":103,"ɯ":110,"ɰ":111,"ŋ":112,"ɳ":113,"ɲ":114,"ɴ":115,"ø":116,"ɸ":118,"θ":119,"œ":120,"ɹ":123,"ɾ":125,"ɻ":126,"ʁ":128,"ɽ":129,"ʂ":130,"ʃ":131,"ʈ":132,"ʧ":133,"ʊ":135,"ʋ":136,"ʌ":138,"ɣ":139,"ɤ":140,"χ":142,"ʎ":143,"ʒ":147,"ʔ":148,"ˈ":156,"ˌ":157,"ː":158,"ʰ":162,"ʲ":164,"↓":169,"→":171,"↗":172,"↘":173,"ᵻ":177};

ort.env.wasm.wasmPaths = new URL("./vendor/onnxruntime-web/", import.meta.url).href;
// Multiple threads need cross-origin isolation headers, which GitHub Pages can't send.
ort.env.wasm.numThreads = 1;

// Load the model and voice when this module is imported. If either fails,
// the import fails.
const [session, voice] = await Promise.all([
  ort.InferenceSession.create(`${MODEL_DIR}/model.onnx`),
  fetch(`${MODEL_DIR}/voices/${VOICE}.bin`).then(async (res) => {
    if (!res.ok) throw new Error(`Voice failed to load: ${res.status}`);
    return new Float32Array(await res.arrayBuffer());
  }),
]);

// --- Text cleanup -----------------------------------------------------------

// "1999" -> "19 99", "2:05" -> "2 oh 5", "3:00" -> "3 o'clock"
function splitNumber(match) {
  if (match.includes(".")) return match;
  if (match.includes(":")) {
    const [h, m] = match.split(":").map(Number);
    if (m === 0) return `${h} o'clock`;
    return m < 10 ? `${h} oh ${m}` : `${h} ${m}`;
  }
  const year = parseInt(match.slice(0, 4), 10);
  if (year < 1100 || year % 1000 < 10) return match;
  const left = match.slice(0, 2);
  const right = parseInt(match.slice(2, 4), 10);
  const s = match.endsWith("s") ? "s" : "";
  if (year % 1000 >= 100 && year % 1000 <= 999) {
    if (right === 0) return `${left} hundred${s}`;
    if (right < 10) return `${left} oh ${right}${s}`;
  }
  return `${left} ${right}${s}`;
}

// "$5" -> "5 dollars", "$1.50" -> "1 dollar and 50 cents"
function money(match) {
  const unit = match[0] === "$" ? "dollar" : "pound";
  const amount = match.slice(1);
  if (isNaN(Number(amount))) return `${amount} ${unit}s`;
  if (!match.includes(".")) return `${amount} ${unit}${amount === "1" ? "" : "s"}`;
  const [whole, part] = amount.split(".");
  const cents = parseInt(part.padEnd(2, "0"), 10);
  const small = match[0] === "$" ? (cents === 1 ? "cent" : "cents") : cents === 1 ? "penny" : "pence";
  return `${whole} ${unit}${whole === "1" ? "" : "s"} and ${cents} ${small}`;
}

// "3.14" -> "3 point 1 4"
function decimal(match) {
  const [whole, part] = match.split(".");
  return `${whole} point ${part.split("").join(" ")}`;
}

function normalize(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/«/g, "“")
    .replace(/»/g, "”")
    .replace(/[“”]/g, '"')
    .replace(/\(/g, "«")
    .replace(/\)/g, "»")
    .replace(/[^\S \n]/g, " ")
    .replace(/  +/, " ")
    .replace(/(?<=\n) +(?=\n)/g, "")
    .replace(/\bD[Rr]\.(?= [A-Z])/g, "Doctor")
    .replace(/\b(?:Mr\.|MR\.(?= [A-Z]))/g, "Mister")
    .replace(/\b(?:Ms\.|MS\.(?= [A-Z]))/g, "Miss")
    .replace(/\b(?:Mrs\.|MRS\.(?= [A-Z]))/g, "Mrs")
    .replace(/\betc\.(?! [A-Z])/gi, "etc")
    .replace(/\b(y)eah?\b/gi, "$1e'a")
    .replace(/\d*\.\d+|\b\d{4}s?\b|(?<!:)\b(?:[1-9]|1[0-2]):[0-5]\d\b(?!:)/g, splitNumber)
    .replace(/(?<=\d),(?=\d)/g, "")
    .replace(/[$£]\d+(?:\.\d+)?(?: hundred| thousand| (?:[bm]|tr)illion)*\b|[$£]\d+\.\d\d?\b/gi, money)
    .replace(/\d*\.\d+/g, decimal)
    .replace(/(?<=\d)-(?=\d)/g, " to ")
    .replace(/(?<=\d)S/g, " S")
    .replace(/(?<=[BCDFGHJ-NP-TV-Z])'?s\b/g, "'S")
    .replace(/(?<=X')S\b/g, "s")
    .replace(/(?:[A-Za-z]\.){2,} [a-z]/g, (m) => m.replace(/\./g, "-"))
    .replace(/(?<=[A-Z])\.(?=[A-Z])/gi, "-")
    .trim();
}

// --- Phonemes and tokens ----------------------------------------------------

// Punctuation passes through to the model; everything between is phonemized.
const PUNCTUATION = /(\s*[;:,.!?¡¿—…"«»“”(){}[\]]+\s*)+/g;

async function toPhonemes(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(PUNCTUATION)) {
    if (last < match.index) parts.push({ punctuation: false, text: text.slice(last, match.index) });
    parts.push({ punctuation: true, text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ punctuation: false, text: text.slice(last) });

  const phonemized = await Promise.all(
    parts.map(async (p) => (p.punctuation ? p.text : (await phonemize(p.text, "en-us")).join(" ")))
  );

  return phonemized
    .join("")
    .replace(/kəkˈoːɹoʊ/g, "kˈoʊkəɹoʊ")
    .replace(/ʲ/g, "j")
    .replace(/r/g, "ɹ")
    .replace(/x/g, "k")
    .replace(/ɬ/g, "l")
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, " ")
    .replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, "z")
    .replace(/(?<=nˈaɪn)ti(?!ː)/g, "di")
    .trim();
}

function tokenize(phonemes) {
  const ids = Array.from(phonemes, (c) => VOCAB[c]).filter((id) => id !== undefined);
  return [0, ...ids.slice(0, MAX_PHONEMES), 0];
}

// --- Synthesis --------------------------------------------------------------

async function synthesize(text) {
  const ids = tokenize(await toPhonemes(normalize(text)));
  // Kokoro picks the voice style by phoneme count.
  const row = Math.min(ids.length - 2, voice.length / STYLE_SIZE - 1);

  const output = await session.run({
    input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]),
    style: new ort.Tensor("float32", voice.slice(row * STYLE_SIZE, (row + 1) * STYLE_SIZE), [1, STYLE_SIZE]),
    speed: new ort.Tensor("float32", new Float32Array([SPEED]), [1]),
  });
  return output[session.outputNames[0]].data;
}

let current;

/**
 * Speak text aloud. Resolves once the audio starts. Create `audioContext`
 * during the user's click so browsers allow playback.
 */
export async function speak(text, audioContext) {
  const samples = await synthesize(text);
  const buffer = audioContext.createBuffer(1, samples.length, SAMPLE_RATE);
  buffer.copyToChannel(samples, 0);

  current?.stop();
  current = audioContext.createBufferSource();
  current.buffer = buffer;
  current.connect(audioContext.destination);
  current.start();
}
