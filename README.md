# TypingTestKaro

A typing-test website for Indian government exams. It covers English and Hindi (Mangal Inscript, Krutidev 010 and Remington GAIL), exam-wise tests, courses, games, tools and a blog.

The site is fully static. `build.js` generates about 135 HTML pages into `site/`, and you can host that folder anywhere: Netlify, Cloudflare Pages, GitHub Pages, Vercel or any shared host.

## Commands

```bash
npm install        # installs `marked` (build-time only)
npm run build      # generates ./site
npm run serve      # serves ./site on http://localhost:8811
```

## Deploy

`site/` is build output and is not committed. On Netlify, Cloudflare Pages or Vercel, use:

- **Build command:** `npm install && npm run build`
- **Output / publish directory:** `site`

## Structure

| Path | What it is |
|---|---|
| `build.js` | Page generator: home, typing tests, exams, courses, lessons, games, tools, blog, static pages, sitemap |
| `build/layout.js` | Page shell: `<head>`/SEO/schema, header mega-menu, footer, site config (`SITE`) |
| `src/data/exams.js` | Exam database (speed, duration, languages, layouts, notes). `official: false` = practice target |
| `src/data/courses.js` | Course curriculum (English, Inscript, Remington). Lessons are generated deterministically |
| `src/data/passages.js` | Passage bank: 24 English and 18 Hindi original exam-style passages |
| `src/content/blog/*.md` | Blog posts (front matter + Markdown; the `## FAQs` section becomes FAQ schema) |
| `src/assets/js/hindi.js` | Inscript map and a live Krutidev→Unicode engine (Remington GAIL / Krutidev typing) |
| `src/assets/js/typing.js` | Typing-test engine: practice and exam (CBT) modes, word alignment, full/half mistakes, net WPM, KDPH, virtual keyboard |
| `src/assets/js/lesson.js` | Lesson player: key by key, stops on error, finger guide, stars |
| `src/assets/js/tools.js` | Hindi typing pad, Krutidev→Unicode converter, speed calculator, "My Progress" |
| `src/assets/js/games/` | Five typing games |
| `src/assets/js/dictation.js` | Dictation test: the browser's text-to-speech reads the passage and you type what you hear |
| `src/assets/js/weak.js` | Weak-key drill built from the characters you missed (runs in the lesson player) |
| `src/assets/js/quiz-app.js` | Keyboard quiz (questions come from `src/data/quiz.js`) |
| `src/assets/js/unicode-krutidev.js`, `translit.js` | Unicode→Krutidev converter and English→Hindi phonetic typing |
| `src/data/passages-mr.js`, `quiz.js`, `shortcuts.js` | Marathi passages, quiz questions and shortcut-key tables |
| `src/assets/js/hero3d.js`, `home-fx.js`, `css/home.css` | Homepage 3D keyboard hero (Three.js from the CDN) and scroll animations (GSAP ScrollTrigger). The hero's phrases and keys are generated in `build.js` |
| `build/sw.template.js` | Offline service worker; the build injects the version and the list of files to pre-cache |

## Typing-test features

- **Test modes:** English, Hindi (Inscript, Krutidev, Remington GAIL) and Marathi. Practice mode highlights words as you type; exam mode uses an exam-style (CBT) interface.
- **Passage sources:** exam passages, a daily passage, common words (optionally with punctuation and numbers), numeric data entry, or custom text you paste in.
- **Results:** gross and net WPM, KDPH, accuracy, error %, consistency, full and half mistakes, a speed-over-time chart, and a weak-keys heatmap. You can also download a practice certificate as a PNG.
- **Settings:** backspace on/off, highlighting on/off, on-screen keyboard, your own Hindi input method, keypress sound, and passage font and size.

## Adding content

- **New exam:** add an object to `src/data/exams.js`, then run the build. Its page, menu entry, sitemap entry and home-page table row are all created automatically.
- **New blog post:** add `src/content/blog/<slug>.md` using the same front matter as the existing posts.
- **New passages:** append to `window.TE_PASSAGES.en` or `.hi` in `src/data/passages.js`. Hindi passages may use only characters you can type on both Inscript and Remington: no digits, no English letters, and no nukta except ड़ and ढ़.

## Before going live

1. Set the real domain and email in `SITE` in `build/layout.js`. The sitemap, canonical links and OG tags all use it.
2. Check the exam rules against the latest notifications. Exams marked `official: false` show "practice target".
3. Optionally add analytics or ads. If you do, update `/privacy-policy/`.

The Krutidev conversion table is adapted from `@bharattype/hindi-transliteration` (MIT). See `src/assets/js/LICENSE-krutidev-converter.txt`.
