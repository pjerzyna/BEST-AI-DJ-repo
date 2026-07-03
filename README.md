# AI DJ — Turn a Vibe into an Album Cover

Two ways to run the same project:

| Mode | Files | Needs | Best for |
|---|---|---|---|
| **🌐 Browser app** | `index.html` + `style.css` + `app.js` | a free HuggingFace token, nothing to install | interactive demo, curating favourites |
| **🐍 Python / Colab** | `dj_collab.py` | a GPU (Colab T4 is enough) | full assignment run with SDXL, reproducible seeds |

The browser app uses two HuggingFace endpoints, called directly from JavaScript (`fetch`):

1. **Text-to-image** (default: `black-forest-labs/FLUX.1-schnell`, via the `hf-inference` provider) — generates the album covers.
2. **Vision-language chat model** (default: `meta-llama/Llama-4-Scout-17B-16E-Instruct`, via HuggingFace's OpenAI-compatible router with automatic provider selection) — looks at a favourite cover and invents a fake album title + 5-song tracklist for it.

## How to run (browser app)

1. Create a free account on [huggingface.co](https://huggingface.co) if you don't have one.
2. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) and create a **Read** token.
3. Serve the folder with a local server (some browsers block `fetch` from a page opened directly as `file://`):

   ```
   cd AIDJ
   python -m http.server 8000
   ```

   then open `http://localhost:8000`. (Or use the VS Code "Live Server" extension.)
4. In **⚙️ API Settings**, paste your token and click "Save settings".

## Generating covers

In **🎨 Cover Generator**, pick one of the 6 built-in acts from the dropdown (or "Custom act…" to write your own), edit the artist/genre/prompt if you want, choose how many variants to generate (1–4 — same prompt, different random seeds, which covers task 4 "run the prompt 4 times and compare"), and click "Generate covers". Every generation replaces the previous result instead of stacking. Covers are generated without any lettering (a "no text" instruction is appended automatically), and you can download each one with the ⬇️ button.

Every prompt of the 6 acts explicitly encodes **style, colors, mood and imagery** (task 3). The seed is shown under each result so you can document what stays the same (subject, style, palette — controlled by the prompt) versus what changes (composition, camera angle, detail — controlled by the seed).

The **🙈 Bad prompt** button runs the deliberately terrible prompt `"music"` (task 5) so you can document what the model does with nothing to work with. Unlike normal generations, the bad prompt is sent **raw** — without the automatic "no text" suffix — so the model truly receives nothing but the single word.

## Documenting tasks 4 & 5 (for the presentation)

**Task 4 — seed comparison.** Select the best act (e.g. *The Velvet Requiem — Dramatic classical*), set variants to **4**, click Generate, and screenshot the resulting grid. Then fill in this template with what you actually see:

> **Stays the same** (controlled by the prompt): subject (grand piano, storm), color palette (crimson / black / gold), painterly chiaroscuro style, overall dramatic mood.
> **Changes** (controlled by the seed): composition and camera angle, placement of the statues, wave shapes and detail, lighting balance.
> **Conclusion:** the prompt controls *what* and *in which style*; the seed controls the specific *composition*.

**Task 5 — terrible prompt.** Click the 🙈 button and screenshot the result. Typical observation: with no style, color, mood, or subject to work with, the model falls back to the most frequent dataset associations for the word — often literally rendering the word "music" as typography, or producing generic notes/instruments on a plain background. Compare it side by side with any task-3 cover to show how much the structured prompt (style + colors + mood + imagery) contributes.

## Favourites + auto title & tracklist

In **⭐ Favorite covers**, add up to 3 covers — either with the ⭐ button directly on a generated result, or with "📂 Load images" to load previously downloaded files. Favorites are displayed as vinyl sleeves (hover a cover to slide the record out). For each favorite you get two options:

- **✨ AI (HF credits)** — the vision model actually looks at the image and returns a matching title + 5-song tracklist in one call. This spends a bit of your monthly included HuggingFace Inference credits (see below).
- **🎲 Random (free)** — a tiny local generator in `app.js` mixes words together to make up a title + tracklist instantly. No network call, no credits, unlimited use — but it never actually looks at the image, so results are generic.

## Why two different endpoints

HuggingFace reorganized its free serverless API into "Inference Providers": the classic `api-inference.huggingface.co/models/{id}` endpoint now only covers the `hf-inference` provider's own (much smaller) catalog — mainly text-to-image, classification, and a few small legacy LLMs. It no longer supports image-to-text or most chat/vision models.

For the vision/title-generation step, the app therefore calls `https://router.huggingface.co/v1/chat/completions` (HuggingFace's OpenAI-compatible router), which automatically picks whichever partner provider (Groq, Together, Fireworks, Novita, …) actually serves the requested model — same token, no extra setup.

## Notes on how it works

- **No stacking**: every "Generate covers" click clears the previous result and shows the new one(s).
- **Real variation on repeat generations**: the image endpoint caches identical requests by default, so sending the same prompt twice used to return the exact same cached image. The app sends `options.use_cache: false` plus a random `seed` on every request, so each generation is genuinely new even with an unchanged prompt.
- **Everything is editable**: the 6 default acts (lo-fi bedroom pop, dramatic classical, chaotic punk, mysterious ambient, cheesy 80s pop duo, and the made-up genre rock'n'roll for kids) are just a starting point.
- **Token stays local**: it is stored in `localStorage` of your browser only and sent exclusively to `*.huggingface.co`.

## Model / API troubleshooting

- If you get a CORS or 404 error on image generation, switch the image endpoint in Settings between the `router.huggingface.co` and `api-inference.huggingface.co` options.
- If a model is "waking up" on HF's servers, the first request can take 20–60 s (`wait_for_model` is enabled for image generation, so the app waits instead of erroring out).
- If you get **"not supported by any provider you have enabled"** for the vision model: pick a different one from the [image-text-to-text model list](https://huggingface.co/models?inference_provider=all&pipeline_tag=image-text-to-text&sort=trending) and paste it into Settings, or check which providers are enabled for your account at [huggingface.co/settings/inference-providers](https://huggingface.co/settings/inference-providers).
- If you get **"You have depleted your monthly included credits"**: every vision/chat model runs through third-party providers that all draw from the same shared monthly credit pool on your HF account. Swapping to a "smaller" model won't help; use the **🎲 Random** button instead until credits reset next month (or you buy more / go PRO).

## Python / Colab version (`dj_collab.py`)

The notebook version runs Stable Diffusion XL locally on a GPU and covers the whole assignment end-to-end:

1. HuggingFace `diffusers` pipeline + test image,
2. the same 6 fictional acts,
3. one cover per act (grid preview),
4. the best act (dramatic classical) generated with 4 fixed seeds + written comparison,
5. the deliberately terrible prompt `"music"` + documentation,
6. a curated selection of 3 favourites exported to a standalone `gallery.html` (same vinyl-sleeve design as the browser app), plus optional saving of all outputs to Google Drive.

Open it in [Google Colab](https://colab.research.google.com) (Runtime → GPU), or run locally with:

```
pip install torch torchvision matplotlib numpy diffusers transformers accelerate
python dj_collab.py
```

Unlike the browser app, this version uses **fixed seeds** (`7, 42, 123, 999`), so the seed-comparison results are fully reproducible.

## Careful

Don't publish this page publicly with your token filled in — the token is stored locally in the browser and has access to your HuggingFace account.
