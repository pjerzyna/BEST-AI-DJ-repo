/* ============================================================
   AI DJ — logika aplikacji (Hugging Face Inference API)
   - text-to-image: FLUX.1-schnell (provider hf-inference)
   - tytuły/tracklisty: model wizyjny przez router.huggingface.co
   ============================================================ */

/* ----------------- 6 fikcyjnych zespołów (zadanie 2 + 3) ----------------- */
const ACTS = {
  lofi_bedroom_pop: {
    artist: "Pillow Static",
    genre: "Lo-fi bedroom pop",
    prompt:
      "cozy teenage bedroom at dusk, cassette player and tangled fairy lights on a windowsill, " +
      "rain on the glass, soft film grain, muted pastel palette of dusty pink, faded teal and warm amber, " +
      "nostalgic dreamy mood, lo-fi anime-inspired illustration, gentle window light",
  },
  dramatic_classical: {
    artist: "The Velvet Requiem",
    genre: "Dramatic classical",
    prompt:
      "grand piano engulfed by a violent ocean storm at night, shattered marble statues sinking in waves, " +
      "dark romanticism, cinematic oil painting, dramatic chiaroscuro lighting, " +
      "deep crimson, obsidian black and fractured gold palette, tempestuous awe-inspiring mood",
  },
  chaotic_punk: {
    artist: "Dumpster Ballet",
    genre: "Chaotic punk",
    prompt:
      "ripped xerox collage of a screaming crowd and a smashed guitar, safety pins and torn tape, " +
      "harsh photocopy texture, DIY zine cut-and-paste style, " +
      "acid yellow, black and blood red palette, aggressive anarchic mood, high contrast grain",
  },
  mysterious_ambient: {
    artist: "Halocline",
    genre: "Mysterious ambient",
    prompt:
      "vast empty fog-covered lake at 4am, a single faint light under the water surface, " +
      "minimalist long-exposure photography, deep indigo, slate grey and pale cyan palette, " +
      "eerie meditative mood, negative space, soft gradients, endless horizon",
  },
  cheesy_80s_pop_duo: {
    artist: "Neon Cousins",
    genre: "Cheesy 80s pop duo",
    prompt:
      "two confident pop singers in shoulder-padded metallic jackets, back to back pose, " +
      "airbrushed 1980s studio portrait, laser grid background, " +
      "hot pink, electric blue and chrome palette, glamorous over-the-top mood, soft glow, retro gloss",
  },
  kids_rocknroll: {
    artist: "The Wiggly Amps",
    genre: "Rock'n'roll for kids (gatunek wymyślony)",
    prompt:
      "cartoon animal band on a cardboard stage, dinosaur drummer and rabbit guitarist mid-jump, " +
      "bold playful children's book illustration, thick outlines, confetti in the air, " +
      "primary red, sunny yellow and sky blue palette, joyful energetic mood",
  },
};

/* FLUX nie obsługuje negative promptu — instrukcję „bez napisów”
   doklejamy do promptu pozytywnego automatycznie. */
const NO_TEXT_SUFFIX = ", no text, no lettering, no typography, no watermark";

/* ----------------- ustawienia ----------------- */
const SETTINGS_KEY = "aidj_settings";

const els = {
  token: document.getElementById("hf-token"),
  imageModel: document.getElementById("image-model"),
  imageBase: document.getElementById("image-base"),
  visionModel: document.getElementById("vision-model"),
  saveSettings: document.getElementById("save-settings"),
  actSelect: document.getElementById("act-select"),
  countSelect: document.getElementById("count-select"),
  artist: document.getElementById("artist-input"),
  genre: document.getElementById("genre-input"),
  prompt: document.getElementById("prompt-input"),
  generateBtn: document.getElementById("generate-btn"),
  badPromptBtn: document.getElementById("bad-prompt-btn"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  fileInput: document.getElementById("file-input"),
  favourites: document.getElementById("favourites"),
  favCounter: document.getElementById("fav-counter"),
};

function loadSettings() {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  if (s.token) els.token.value = s.token;
  if (s.imageModel) els.imageModel.value = s.imageModel;
  if (s.imageBase) els.imageBase.value = s.imageBase;
  if (s.visionModel) els.visionModel.value = s.visionModel;
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    token: els.token.value.trim(),
    imageModel: els.imageModel.value.trim(),
    imageBase: els.imageBase.value,
    visionModel: els.visionModel.value.trim(),
  }));
  setStatus("Ustawienia zapisane lokalnie ✔");
}

function getToken() {
  const t = els.token.value.trim();
  if (!t) {
    setStatus("Najpierw wklej token Hugging Face w ⚙️ Ustawieniach API.", true);
    document.getElementById("settings-panel").open = true;
    throw new Error("no token");
  }
  return t;
}

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.classList.toggle("error", isError);
}

/* ----------------- generator okładek (zadania 1, 3, 4, 5) ----------------- */
function fillActForm() {
  const key = els.actSelect.value;
  if (key === "custom") {
    els.artist.value = "";
    els.genre.value = "";
    els.prompt.value = "";
    return;
  }
  const act = ACTS[key];
  els.artist.value = act.artist;
  els.genre.value = act.genre;
  els.prompt.value = act.prompt;
}

async function generateImage(prompt, seed) {
  const url = els.imageBase.value + els.imageModel.value.trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt + NO_TEXT_SUFFIX,
      parameters: { seed },
      /* bez use_cache:false HF zwraca ten sam obraz dla identycznego zapytania */
      options: { use_cache: false, wait_for_model: true },
    }),
  });
  if (!res.ok) throw new Error(await friendlyApiError(res));
  const blob = await res.blob();
  return { objectUrl: URL.createObjectURL(blob), dataUrl: await blobToDataUrl(blob), seed };
}

async function handleGenerate(promptOverride = null) {
  let prompt = promptOverride ?? els.prompt.value.trim();
  if (!prompt) { setStatus("Prompt jest pusty.", true); return; }

  const count = promptOverride ? 1 : parseInt(els.countSelect.value, 10);
  els.generateBtn.disabled = true;
  els.badPromptBtn.disabled = true;
  els.results.innerHTML = ""; // brak „stackowania” — nowa generacja zastępuje starą

  try {
    for (let i = 0; i < count; i++) {
      const seed = Math.floor(Math.random() * 2 ** 31);
      setStatus(`Generuję ${i + 1} / ${count} (seed ${seed})… pierwszy request może trwać 20–60 s.`);
      const img = await generateImage(prompt, seed);
      addResultCard(img, i + 1, count);
    }
    setStatus(count > 1
      ? "Gotowe. Porównaj warianty: treść i styl są stałe (prompt), kompozycja się zmienia (seed)."
      : "Gotowe.");
  } catch (e) {
    if (e.message !== "no token") setStatus(e.message, true);
  } finally {
    els.generateBtn.disabled = false;
    els.badPromptBtn.disabled = false;
  }
}

function addResultCard(img, idx, total) {
  const card = document.createElement("div");
  card.className = "result-card";
  card.innerHTML = `
    <img src="${img.objectUrl}" alt="Wygenerowana okładka ${idx}/${total}">
    <div class="row">
      <span>seed ${img.seed}</span>
      <span>
        <a href="${img.objectUrl}" download="cover_seed${img.seed}.png" title="Pobierz">⬇️</a>
        <button title="Dodaj do ulubionych" aria-label="Dodaj do ulubionych">⭐</button>
      </span>
    </div>`;
  card.querySelector("button").addEventListener("click", () => addFavourite({
    dataUrl: img.dataUrl,
    artist: els.artist.value.trim() || "Unknown Artist",
    genre: els.genre.value.trim() || "—",
    album: null,
    tracks: null,
  }));
  els.results.appendChild(card);
}

/* ----------------- ulubione + tytuły/tracklisty (zadanie 6) ----------------- */
let favourites = [];

function addFavourite(fav) {
  if (favourites.length >= 3) {
    setStatus("Masz już 3 ulubione — usuń jedną, żeby dodać kolejną.", true);
    return;
  }
  favourites.push(fav);
  renderFavourites();
}

function removeFavourite(i) {
  favourites.splice(i, 1);
  renderFavourites();
}

function renderFavourites() {
  els.favCounter.textContent = `${favourites.length} / 3`;
  els.favourites.innerHTML = "";
  favourites.forEach((fav, i) => {
    const tracksHtml = (fav.tracks || [])
      .map((t, j) => `<li><span class="no">${String(j + 1).padStart(2, "0")}</span>${t}</li>`)
      .join("");
    const el = document.createElement("article");
    el.className = "sleeve";
    el.innerHTML = `
      <div class="cover-wrap">
        <img src="${fav.dataUrl}" alt="${fav.album || "Ulubiona okładka"}">
        <div class="vinyl"></div>
      </div>
      <div class="meta">
        <p class="genre">${fav.genre} · LP ${String(i + 1).padStart(2, "0")}</p>
        <h3>${fav.album || "— bez tytułu —"}</h3>
        <p class="artist">${fav.artist}</p>
        <ol class="tracks">${tracksHtml}</ol>
        <div class="btn-row">
          <button class="btn btn-gold ai-btn">✨ AI (kredyty HF)</button>
          <button class="btn btn-ghost rnd-btn">🎲 Losowo (za darmo)</button>
          <button class="btn btn-ghost del-btn">🗑 Usuń</button>
        </div>
      </div>`;
    el.querySelector(".ai-btn").addEventListener("click", (ev) => aiTitle(fav, ev.target));
    el.querySelector(".rnd-btn").addEventListener("click", () => { randomTitle(fav); renderFavourites(); });
    el.querySelector(".del-btn").addEventListener("click", () => removeFavourite(i));
    els.favourites.appendChild(el);
  });
}

/* ✨ model wizyjny naprawdę „patrzy” na okładkę (router HF, format OpenAI) */
async function aiTitle(fav, btn) {
  btn.disabled = true;
  setStatus("Model wizyjny ogląda okładkę…");
  try {
    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: els.visionModel.value.trim(),
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "text", text:
              `This is an album cover for the music genre "${fav.genre}". ` +
              "Invent a fitting fake album title and a 5-song tracklist that match the mood of the image. " +
              'Respond ONLY with minified JSON, no markdown: {"album":"...","tracks":["...","...","...","...","..."]}' },
            { type: "image_url", image_url: { url: fav.dataUrl } },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(await friendlyApiError(res));
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || "")
      .replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    fav.album = parsed.album;
    fav.tracks = parsed.tracks.slice(0, 5);
    renderFavourites();
    setStatus("Tytuł i tracklista gotowe ✔");
  } catch (e) {
    if (e.message !== "no token") setStatus(e.message, true);
  } finally {
    btn.disabled = false;
  }
}

/* 🎲 lokalny generator — zero API, zero kredytów (nie patrzy na obraz) */
const RND = {
  adj: ["Velvet", "Broken", "Midnight", "Golden", "Silent", "Electric", "Faded", "Wild", "Hollow", "Neon"],
  noun: ["Requiem", "Horizon", "Static", "Mirrors", "Tide", "Echoes", "Parade", "Ashes", "Signal", "Garden"],
  track: ["Overture", "Interlude", "Reprise", "Lullaby", "Anthem", "Sonata", "Transmission", "Waltz", "Hymn", "Finale"],
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomTitle(fav) {
  fav.album = `${pick(RND.adj)} ${pick(RND.noun)}`;
  fav.tracks = Array.from({ length: 5 }, (_, i) =>
    `${pick(RND.adj)} ${pick(RND.track)}${i === 4 ? " (Reprise)" : ""}`);
}

/* ----------------- pomocnicze ----------------- */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function friendlyApiError(res) {
  const text = await res.text();
  if (res.status === 401) return "Błąd 401 — token jest nieprawidłowy lub wygasł.";
  if (text.includes("depleted"))
    return "Wyczerpane miesięczne kredyty HF Inference — użyj przycisku 🎲 Losowo albo poczekaj do resetu.";
  if (text.includes("not supported"))
    return "Model niedostępny u tego providera — zmień model lub endpoint w ⚙️ Ustawieniach.";
  if (res.status === 503) return "Model się „budzi” na serwerach HF — spróbuj ponownie za chwilę.";
  return `Błąd API (${res.status}): ${text.slice(0, 160)}`;
}

/* ----------------- start ----------------- */
function init() {
  for (const [key, act] of Object.entries(ACTS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${act.artist} — ${act.genre}`;
    els.actSelect.appendChild(opt);
  }
  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "Custom act… (własny prompt)";
  els.actSelect.appendChild(custom);

  els.actSelect.value = "dramatic_classical";
  fillActForm();

  els.actSelect.addEventListener("change", fillActForm);
  els.saveSettings.addEventListener("click", saveSettings);
  els.generateBtn.addEventListener("click", () => handleGenerate());
  els.badPromptBtn.addEventListener("click", () => handleGenerate("music"));

  els.fileInput.addEventListener("change", async (e) => {
    for (const file of [...e.target.files].slice(0, 3 - favourites.length)) {
      addFavourite({
        dataUrl: await blobToDataUrl(file),
        artist: "Unknown Artist",
        genre: "wczytane z pliku",
        album: null,
        tracks: null,
      });
    }
    e.target.value = "";
  });

  loadSettings();
  renderFavourites();
}

init();
