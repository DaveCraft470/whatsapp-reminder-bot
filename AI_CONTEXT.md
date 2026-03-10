# Manvi — AI Agent Context

This document is the authoritative reference for AI coding assistants (Claude, Cursor, GPT) working on the Manvi codebase. Read this before touching any file.

---

## Request Flow

```
WhatsApp → Meta Webhook → server.js → gemini.js (intent) → server.js (DB execution) → sendMessage.js
```

---

## File Responsibilities

| File | Responsibility |
| :--- | :--- |
| `src/server.js` | Webhook entry point, Caller ID, intent router, API endpoints (`/api/ping`, `/api/status`) |
| `src/gemini.js` | 4-tier AI waterfall — Gemini 3 → Gemini 2.5 → Groq → GPT-4o-mini |
| `src/search.js` | Web search — Tavily primary, Serper fallback |
| `src/usage.js` | Self-healing daily row creation, quota reads/writes, low-credit alerts |
| `src/scheduler.js` | node-cron IST-aware job runner for reminders, routines, and events |
| `src/supabase.js` | Supabase client initialisation |
| `src/sendMessage.js` | Meta WhatsApp Cloud API wrapper |
| `public/index.html` | Manvi OS status dashboard (static) |
| `public/styles.css` | Dashboard styles |
| `public/app.js` | Dashboard frontend — fetches `/api/status`, renders charts and metrics |
| `package.json` | Root level. `src/server.js` requires it as `../package.json` |

---

## AI Waterfall — 4 Tiers (`gemini.js`)

Each tier is attempted in order. Cascade only on error or quota exhaustion.

| Tier | Model | Provider | Quota | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `gemini-3-flash-preview` | Google | ~20 req/day (free) | `gemini_count` |
| 2 | `gemini-2.5-flash` | Google | ~20 req/day (free) | `gemini_count` (shared with Tier 1, cap: 40) |
| 3 | `llama-3.3-70b-versatile` | Groq | 3,000 req/day safety cap (free) | `groq_count` |
| 4 | `openai/gpt-4o-mini` | OpenRouter | 50 req/day safety cap (paid ~$5) | `openrouter_count` |

### Return Contract

This is critical. Both callers in `server.js` must handle returns correctly.

| Call | Returns |
| :--- | :--- |
| `analyzeMessage(msg)` | Parsed JSON with `intent`, `targetName`, `time`, `date`, `taskOrMessage`, `ai_meta` |
| `analyzeMessage(prompt, true)` | `{ text: string, ai_meta: string }` — never a plain string |

`server.js` accesses `summaryResult.text` and passes `summaryResult.ai_meta` as `overrideAiMeta` to `respond()`.

---

## `respond()` — Single Exit Point

```js
const respond = async (responseText, overrideAiMeta) => {
  const meta = overrideAiMeta !== undefined ? overrideAiMeta : ai_meta;
  const finalText = meta ? `${responseText}\n\n${meta}` : responseText;
  return await replyAndLog(senderPhone, senderName, message, finalText);
};
```

**Rules:**
- `ai_meta` is appended only inside `respond()`. Never manually concatenate it at the call site.
- For web search, pass `summaryResult.ai_meta` as `overrideAiMeta` — the summarising model may differ from the intent model.
- `ai_meta` is plain text. No markdown italic wrapping.

---

## Scheduler Logic (`scheduler.js`)

All IST operations use `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"`.

### CRON 1 — One-off reminders (`* * * * *`)
- Queries `personal_reminders` where `status = 'pending'` and `reminder_time <= now` (ISO UTC comparison)
- `reminder_time` is `TIMESTAMPTZ` — stored by `buildReminderDate()` in `server.js` as a `+05:30` offset ISO string
- On match: sends message, updates `status` to `'completed'`

### CRON 2 — Daily routines (`* * * * *`)
- Gets current IST time as `HH:mm` via `Intl.DateTimeFormat("en-GB", { hour12: false })`
- Matches `daily_routines` using `.like("reminder_time", \`${timeStr}%\`)` — prefix match against stored `HH:mm` value
- `reminder_time` in `daily_routines` **must** be `HH:mm` 24-hour format (e.g., `09:00`)

### CRON 3 — Special event alerts (`30 8 * * *` — 08:30 IST)
- Two checks per event in the same run: today (celebratory) and tomorrow (advance warning)
- Tomorrow calculated via `setDate(getDate() + 1)` in UTC — can be 1 day off near midnight IST, safe for the 08:30 window

---

## Usage Tracking (`usage.js`)

- `ensureRowExists()` self-creates today's IST row if missing. Call before any read or write.
- `track(service)` does SELECT then UPDATE — not atomic. Acceptable for single-user use.
- `getUsage()` returns: `{ gemini, groq, openrouter, serper, tavily, errorsToday, historyLabels, historyData, errorData, historyRaw, daysTracked }`
- Low-credit WhatsApp alerts fire at 50, 10, 0 remaining for `serper` and `tavily`
- All 4-tier failures call `track("error")` — increments `error_count` column, visible on dashboard

---

## Database Schema

| Table | Key columns | Notes |
| :--- | :--- | :--- |
| `contacts` | `name`, `phone` | Address book |
| `personal_reminders` | `phone`, `message`, `reminder_time TIMESTAMPTZ`, `group_name`, `status` | `status` = `pending` / `completed` |
| `daily_routines` | `phone`, `task_name`, `reminder_time TIME`, `is_active` | `reminder_time` stored as `HH:mm` |
| `special_events` | `phone`, `event_type`, `person_name`, `event_date DATE` | |
| `interaction_logs` | `sender_name`, `sender_phone`, `message`, `bot_response` | Stealth logger |
| `api_usage` | `usage_date DATE PK`, `gemini_count`, `groq_count`, `openrouter_count`, `tavily_count`, `serper_count`, `error_count` | Rows auto-created by `ensureRowExists()` |

**If upgrading from a pre-Groq install, run:**
```sql
ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS groq_count INT DEFAULT 0;
ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0;
```

---

## Dashboard (`/api/status`)

Served at the root URL via `app.use(express.static("public"))`.

`/api/status` returns:
```json
{
  "success": true,
  "version": "3.2.0",
  "uptime": { "days": 0, "hours": 2, "minutes": 14, "seconds": 32 },
  "limits": { "gemini": 40, "groq": 3000, "openrouter": 50, "serper": 2500, "tavily": 1000 },
  "stats": { "gemini": 5, "groq": 0, "openrouter": 0, "serper": 0, "tavily": 12, "errorsToday": 0, "historyLabels": [...], "historyData": [...], "errorData": [...], "historyRaw": [...], "daysTracked": 14 },
  "jobs": [ { "name": "...", "schedule": "...", "description": "...", "status": "active|scheduled" } ]
}
```

`/api/ping` (used by cron-job.org keep-alive) returns:
```json
{ "status": "ok", "latency_ms": 42, "timestamp": "..." }
```

---

## `queryOnlyIntents` — Address Book Bypass

These intents do not need a contact phone number. They bypass the address book lookup in `server.js`:

```js
["query_birthday", "query_schedule", "query_events", "query_reminders", "query_routines", "query_contacts"]
```

---

## `save_contact` Intent

Adds or updates an entry in the `contacts` table. Owner only.

**JSON shape returned by AI:**
```json
{
  "intent": "save_contact",
  "targetName": "Manu",
  "taskOrMessage": "Manu",
  "phone": "919876543210",
  "time": null,
  "date": null
}
```

**Handler behaviour (`server.js`):**
- Strips all non-digit characters from `aiResult.phone` before saving
- Validates minimum 10 digits (rejects if shorter)
- Uses `upsert` with `onConflict: "name"` — updating an existing contact's number does not create a duplicate
- `taskOrMessage` carries the name; `aiResult.phone` carries the raw number string from the AI

---

## Key Constraints

- **No emojis** in bot-generated WhatsApp messages or server logs — plain text only.
- **No LaTeX** in WhatsApp responses.
- **Keep responses concise** — WhatsApp is not a document editor.
- **IST everywhere** — use `Asia/Kolkata`. Use `Intl.DateTimeFormat("en-GB", { hour12: false })` for `HH:mm`.
- **Do not conflate reminder time types**: `personal_reminders.reminder_time` is `TIMESTAMPTZ`. `daily_routines.reminder_time` is `HH:mm` string. Different matching logic.
- **`respond()` owns `ai_meta`** — never append it manually at call sites.
- **`analyzeMessage(prompt, true)` returns `{ text, ai_meta }`** — never treat as plain string.
- **`track("groq")` must be called** after every successful Groq response.
- **`track("error")` must be called** when all 4 tiers fail.
- **`save_contact` uses `aiResult.phone`** directly — not `taskOrMessage`. Strip non-digits with `replace(/\D/g, "")` before any validation or insert.
- **`save_contact` upserts on `name`** — never use plain `insert` or you will get duplicate key errors on re-saves.
- **Caller ID gates admin commands** to `MY_PHONE_NUMBER`.
- **`package.json` is at the project root** — required in `server.js` as `../package.json` (not `./package.json`).
- **No hardcoded secrets** — all credentials from `.env`.

---

## Known Limitations (Accepted)

| Issue | Impact | Mitigation |
| :--- | :--- | :--- |
| `track()` not atomic | Race condition on double-tap | Acceptable for single-user use |
| Webhook duplicate delivery | Same message processed twice | Acceptable for personal use; add `messageId` dedup if needed |
| Tomorrow UTC edge case | Event alert 1 day off near midnight IST | Safe for 08:30 cron window |