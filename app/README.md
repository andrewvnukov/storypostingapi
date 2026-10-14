# StoryPostingApi

Web app that turns Reddit stories into vertical narrated videos and publishes them to your own
TikTok accounts — immediately or on a schedule — through the official **TikTok Content Posting API**.

## What it does

- **Connect accounts** — TikTok Login Kit with PKCE, tokens stored locally and refreshed automatically.
- **Story studio** — paste a Reddit post link (or your own text), pick a background clip, a voice,
  a speaking speed and a caption style, then render a 1080×1920 video with burned-in captions and an
  opening headline card.
- **Preview** — watch the result in the browser before anything is sent to TikTok.
- **Monitor** — per account: followers, likes, video count, and the view / like / comment / share
  counts of recent videos (TikTok Display API).
- **Publish or schedule** — pick the posting options the account actually allows, read live from
  `creator_info/query`, then post now or at a chosen time.
- **Queue worker** — checks every minute, uploads the file in chunks, then polls `status/fetch`
  until TikTok reports `PUBLISH_COMPLETE` and links the published post.

### How a story becomes a video

```
Reddit JSON  ──►  narration text  ──►  text-to-speech (mp3)
                                              │
      background clip ──► random slice ───────┼──► ffmpeg: scale+crop 1080x1920,
                                              │     burn ASS captions, mux audio
      headline ──► opening card ──────────────┘               │
                                                              ▼
                                                   preview ──► publish / schedule
```

Captions are timed by spreading the narration across the measured audio duration in proportion to
each cue's length — close enough for read-aloud narration and it needs no forced alignment.

Two publishing modes: **Direct Post** (`video.publish`) puts the video straight on the account, and
**Drafts** (`video.upload`) sends it to the creator's TikTok inbox to finish inside the TikTok app.

## What it cannot do

The official API exposes **only the account that authorized the app**. There is no endpoint for
reading other people's channels — TikTok's Research API is restricted to accredited researchers —
so "monitoring" here means the accounts you connect, and nothing is scraped.

## Setup

```bash
cd app
npm install
cp .env.example .env     # TikTok client key/secret/redirect URI + a text-to-speech key
npm start                # http://localhost:3000
```

`ffmpeg` and `ffprobe` must be on PATH. Put background clips you have the rights to use in
`assets/backgrounds/` (or upload them from the Story studio page).

Text to speech is pluggable: `TTS_PROVIDER=openai` (default) or `elevenlabs`, each with its own API
key in `.env`. Nothing is sent to the provider until you press **Generate video**.

The redirect URI must match the one registered in the developer portal character for character,
including the scheme and the trailing path.

Scopes requested by default: `user.info.basic`, `user.info.profile`, `user.info.stats`,
`video.list`, `video.upload`, `video.publish`. Keep `TIKTOK_SCOPES` equal to the scopes approved
for the app — asking for more than was approved makes authorization fail.

## Review requirements this implements

TikTok rejects Content Posting API apps whose publish screen does not reflect the creator's own
settings. The compose page covers it:

| Requirement | Where |
|---|---|
| Call `creator_info/query` before showing the form | `src/routes.js` → `GET /compose` |
| Show nickname, avatar, max video duration | `src/views/compose.ejs` |
| Render the returned `privacy_level_options`, nothing preselected | `compose.ejs`, `public/compose.js` |
| Grey out comment / duet / stitch when disabled on the account | `compose.ejs` |
| Branded content blocked with private visibility | `public/compose.js` + server check in `routes.js` |
| Music Usage Confirmation and Branded Content Policy consent text | `compose.ejs` |
| AI-generated content flag (`is_aigc`) | `publish_options.ejs`, pre-ticked for synthetic narration |

Until the app passes audit, an unaudited client can only publish privately, and the test account
must be added in the Sandbox of the developer portal.

## Layout

```
src/config.js        environment + paths
src/db.js            SQLite schema: accounts, renders, queue
src/tiktok.js        OAuth, Display API, Content Posting API, chunked upload
src/publish.js       shared validation of the publish form
src/routes.js        accounts, monitoring, file upload
src/story_routes.js  the Story studio: fetch, render, preview, publish
src/story/reddit.js  reads a public Reddit post
src/story/tts.js     text to speech (OpenAI / ElevenLabs)
src/story/video.js   caption timing, ASS generation, ffmpeg composition
src/scheduler.js     every-minute worker: publish due posts, poll status
src/views/           EJS templates
public/compose.js    publish-form rules in the browser
public/story.js      studio editor behaviour
assets/backgrounds/  your background clips
```
