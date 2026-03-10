# Manvi

A personal WhatsApp assistant with a 4-tier AI fallback engine, live web search, and a self-hosted monitoring dashboard. Built to stay online even when individual AI providers hit rate limits.

---

## Overview

Most reminder apps require you to leave WhatsApp, navigate a separate interface, and remember to return. Manvi removes that friction by living inside the conversation itself.

Write naturally, like texting a contact:

```
Remind me at 4 PM to review the Onemark proposal
```

Manvi parses the intent, stores the reminder, and fires it at exactly 4 PM IST — no app switching, no rigid command syntax.

---

## What It Does

| Feature | Description |
|---|---|
| Natural language parsing | Understands free-form input via a 4-tier AI waterfall |
| One-off reminders | Set by time or relative duration ("in 10 minutes") |
| Daily routines | Repeating tasks matched by IST time every minute |
| Yearly events | Birthdays, anniversaries with a 24-hour advance alert |
| Double-lock event alerts | Day-before warning + same-day notification at 08:30 IST |
| Live web search | Tavily primary, Serper fallback, AI-summarised results |
| Instant message dispatch | Forward messages to saved contacts by name |
| Schedule query | "What's my schedule for tomorrow?" |
| Birthday lookup | Queries `special_events` table directly |
| Usage dashboard | `/limit` command via WhatsApp; full web dashboard at root URL |
| Caller ID | Admin commands restricted to owner phone number |
| Address book | Contact name-to-phone resolution via Supabase |
| AI error tracking | All 4-tier failures tracked in `api_usage.error_count` |

---

## AI Architecture — 4-Tier Waterfall

Each request cascades down the chain only on failure or quota exhaustion.

```
Tier 1   Gemini 3 Flash Preview    Free   ~20 req/day
Tier 2   Gemini 2.5 Flash          Free   ~20 req/day  (shared 40/day cap with Tier 1)
Tier 3   Groq — Llama 3.3 70b     Free   3,000 req/day safety cap
Tier 4   OpenRouter — GPT-4o-mini  Paid   50 req/day safety cap (~$5 credit)
```

All tiers return `{ text, ai_meta }` for summary requests and a parsed JSON object with `ai_meta` for intent requests. The `ai_meta` field appears in the WhatsApp reply footer so you always know which model handled the request.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ / Express 5 |
| Messaging | Meta WhatsApp Cloud API |
| AI Tier 1–2 | Google Gemini (via `@google/generative-ai`) |
| AI Tier 3 | Groq (via OpenAI-compatible SDK) |
| AI Tier 4 | OpenRouter (via OpenAI SDK) |
| Search Primary | Tavily — 1,000 req/month (free) |
| Search Fallback | Serper — 2,500 req/lifetime (free) |
| Database | Supabase (PostgreSQL) |
| Scheduler | node-cron — IST-aware cron jobs |
| Dashboard | Vanilla JS + Chart.js, served as static files |
| Hosting | Render.com |

---

## Database Schema

Seven tables. Run in the Supabase SQL Editor:

```sql
-- Address book
CREATE TABLE contacts (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL
);

-- One-off reminders
CREATE TABLE personal_reminders (
  id            SERIAL PRIMARY KEY,
  phone         VARCHAR(20) NOT NULL,
  message       TEXT NOT NULL,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  group_name    VARCHAR(50),
  status        VARCHAR(20) DEFAULT 'pending',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily routines
-- reminder_time stored as HH:mm in 24-hour format
CREATE TABLE daily_routines (
  id            SERIAL PRIMARY KEY,
  phone         VARCHAR(20) NOT NULL,
  task_name     TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE
);

-- Yearly events (birthdays, anniversaries)
CREATE TABLE special_events (
  id          SERIAL PRIMARY KEY,
  phone       VARCHAR(20) NOT NULL,
  event_type  VARCHAR(50),
  person_name VARCHAR(100),
  event_date  DATE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interaction log
CREATE TABLE interaction_logs (
  id           SERIAL PRIMARY KEY,
  sender_name  VARCHAR(50),
  sender_phone VARCHAR(20) NOT NULL,
  message      TEXT NOT NULL,
  bot_response TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracker (rows auto-created by usage.js)
CREATE TABLE api_usage (
  usage_date      DATE PRIMARY KEY,
  gemini_count    INT DEFAULT 0,
  groq_count      INT DEFAULT 0,
  openrouter_count INT DEFAULT 0,
  tavily_count    INT DEFAULT 0,
  serper_count    INT DEFAULT 0,
  error_count     INT DEFAULT 0
);
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/viswabnath/manvi-whatsapp-assistant.git
cd manvi-whatsapp-assistant
npm install
```

### 2. Environment

Create `.env` in the project root. Do not commit this file.

```env
PORT=3000
VERIFY_TOKEN=your_webhook_verify_token
MY_PHONE_NUMBER=91xxxxxxxxxx

# Meta Cloud API
PHONE_NUMBER_ID=your_meta_phone_number_id
ACCESS_TOKEN=your_meta_access_token

# Supabase
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# AI — 4-Tier Waterfall
GEMINI_API_KEY=your_gemini_key          # https://aistudio.google.com
GROQ_API_KEY=your_groq_key              # https://console.groq.com
OPENROUTER_API_KEY=your_openrouter_key  # https://openrouter.ai

# Search
TAVILY_API_KEY=your_tavily_key          # https://www.tavily.com
SERPER_API_KEY=your_serper_key          # https://serper.dev
```

### 3. Run

```bash
npm start          # production
npm run dev        # development with nodemon
```

---

## Deploy to Render

1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `npm start`
4. Add all `.env` keys under **Environment Variables**.
5. Set your Meta webhook URL to `https://your-render-url.onrender.com/webhook`.
6. Configure an external cron job (e.g., [cron-job.org](https://cron-job.org)) to hit `GET /api/ping` every 10 minutes to prevent the free instance from sleeping.

---

## Project Structure

```
manvi-whatsapp-assistant/
├── public/
│   ├── index.html       # Manvi OS status dashboard
│   ├── styles.css       # Dashboard styles
│   └── app.js           # Dashboard frontend logic
├── server.js            # Webhook handler, intent router, API endpoints
├── gemini.js            # 4-tier AI waterfall
├── scheduler.js         # node-cron IST job runner
├── search.js            # Tavily + Serper orchestration
├── usage.js             # API quota tracking with self-healing rows
├── supabase.js          # Database client
├── sendMessage.js       # Meta WhatsApp API wrapper
├── package.json
└── .env                 # Not committed
```

---

## Meta Token Reference

### VERIFY_TOKEN

A string you create. Set it in `.env` and in the Meta Developer Dashboard webhook configuration. Meta sends this string when verifying your endpoint — they must match exactly.

### ACCESS_TOKEN

Authorises outbound WhatsApp messages.

- **Development**: Temporary token from the Meta Dashboard. Expires every 24 hours. When expired, `sendMessage.js` will throw a 401 error.
- **Production**: Create a System User in Meta Business Settings and generate a permanent token with `whatsapp_business_messaging` permissions.

---

## Common Issues

**Webhook verification failed**
`VERIFY_TOKEN` in `.env` does not match the value in the Meta Dashboard.

**401 Unauthorized on outbound messages**
Temporary `ACCESS_TOKEN` has expired. Refresh it in the Meta Dashboard.

**Reminder fired at the wrong time**
`personal_reminders.reminder_time` is a `TIMESTAMPTZ` value. Verify that `buildReminderDate()` is producing the correct `+05:30` offset ISO string on insert.

**Routine not firing**
`daily_routines.reminder_time` must be stored as `HH:mm` 24-hour format (e.g., `09:00`). The scheduler uses prefix string matching against the current IST time.

**Event alert not received**
The alert cron runs at 08:30 IST daily. Verify the server is alive at that time (see keep-alive cron above) and that the event date in the database is correct.

**Dashboard shows no data**
Check that the `api_usage` table exists and that `error_count` column is present. If upgrading from an earlier version: `ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0;`

**All AI models offline**
All four tiers have hit their daily limits simultaneously — extremely unlikely in single-user operation. The error is tracked in `api_usage.error_count` and visible on the dashboard.

---

## License

MIT — see `LICENSE`.

Built by [Onemark Digital Agency](https://onemark.agency).