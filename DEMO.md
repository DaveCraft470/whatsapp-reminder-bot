# Manvi — Demo Scenarios

Exact WhatsApp reply format for every supported interaction. All messages are plain text — no markdown bold/italic rendered here for clarity, but bold (`*text*`) and the `ai_meta` footer appear in actual WhatsApp output as shown.

---

## Section 1 — Greetings

Hardcoded responses. No AI call, no API usage.

**Owner:**
```
Hi / Hello / Hey

→ Hello Viswanath. Manvi online. You can set reminders, routines, events,
  search the web, or query your schedule.
```

**Known contact:**
```
Hello  [from Manu's number]

→ Hello Manu. I am Manvi, Viswanath's personal assistant.
```

**Unknown number:**
```
Hello  [from unrecognised number]

→ Hello Guest. I am Manvi, Viswanath's personal assistant.
```

---

## Section 2 — Usage Dashboard

No AI call.

```
/limit

→ System Limits

  AI Engines
  Gemini: 5 / 40
  Groq: 12 / 3000
  OpenRouter: 0 / 50

  Search Engines
  Tavily (monthly): 45 / 1000
  Serper (lifetime): 12 / 2500

  Status: Operational
```

---

## Section 3 — One-Off Reminders

```
Remind me at 6 PM to call dad

→ Reminder set for 6:00 PM.

  Gemini 3 Flash — 38 remaining
```

```
Remind me in 10 minutes to check the build

→ Reminder set for 3:45 PM.

  Gemini 3 Flash — 37 remaining
```

```
Remind Manu at 9 AM to take her medicine

→ Reminder set for 9:00 AM.

  Gemini 3 Flash — 36 remaining
```
Manu's phone receives at 9:00 AM:
```
Reminder: take her medicine
```

```
Remind me to drink water   [no time given]

→ Please specify a time for the reminder.

  Gemini 3 Flash — 35 remaining
```

---

## Section 4 — Query Reminders (Owner only)

```
What are my reminders?

→ Upcoming Reminders:

  - [Mar 10, 6:00 PM] call dad
  - [Mar 11, 9:00 AM] Manu: take her medicine

  Gemini 3 Flash — 34 remaining
```

Empty state:
```
→ No upcoming reminders.

  Gemini 3 Flash — 34 remaining
```

Guest attempt:
```
→ Access denied. These records are private.

  Gemini 3 Flash — 34 remaining
```

---

## Section 5 — Daily Routines

```
Set a daily routine to check server logs at 9 AM

→ Routine set — check server logs daily at 9:00 AM.

  Gemini 3 Flash — 33 remaining
```

Every day at 9:00 AM, Manvi sends:
```
Daily Routine: check server logs
```

Query:
```
What are my daily routines?

→ Active Daily Routines:

  - 9:00 AM: check server logs
  - 10:00 AM: drink water

  Gemini 3 Flash — 32 remaining
```

Empty state:
```
→ No active routines.
```

---

## Section 6 — Special Events

```
Manu's birthday is on Feb 9th 2027

→ Saved Manu's birthday on 2027-02-09.

  Gemini 3 Flash — 31 remaining
```

```
When is Manu's birthday?

→ Manu's birthday: 2027-02-09.

  Gemini 3 Flash — 30 remaining
```

Not found:
```
→ No birthday saved for Manu.

  Gemini 3 Flash — 30 remaining
```

---

## Section 7 — Double-Lock Event Alerts

Automated — sent by the scheduler at 08:30 IST. No `ai_meta` footer (scheduler bypasses `respond()`).

**Day before:**
```
Advance notice: Tomorrow is Manu's birthday. Plan ahead.
```

**Day of:**
```
Today is Manu's birthday. Time to reach out.
```

---

## Section 8 — Schedule Query

```
What is my schedule for today?

→ Schedule — 2026-03-10

  Events:
  - Manu — birthday

  Reminders:
  - 6:00 PM: call dad

  Gemini 3 Flash — 28 remaining
```

Nothing scheduled:
```
→ No events or reminders found for 2026-03-10.

  Gemini 3 Flash — 28 remaining
```

```
What is my schedule for tomorrow?
→ Same format with tomorrow's date. AI calculates date from IST context.
```

---

## Section 9 — Instant Message Dispatch

```
Tell Manu I will be 10 minutes late

→ Message sent to Manu.

  Gemini 3 Flash — 27 remaining
```

Manu receives:
```
Message from Viswanath: I will be 10 minutes late
```

Guest forwarding to owner:
```
Tell him I'm on my way  [from Manu]

→ Message forwarded.

  Gemini 3 Flash — 26 remaining
```

Viswanath receives:
```
Message from Manu: I'm on my way
```

Contact not found:
```
→ Contact "Ravi" not found in address book.

  Gemini 3 Flash — 25 remaining
```

---

## Section 10 — Web Search

```
Who won the recent ICC T20 World Cup?

→ Search Results (Tavily)

  India won the ICC Men's T20 World Cup, defeating South Africa by 7 runs
  in the final held in Barbados.

  Gemini 3 Flash — 24 remaining
```

The `ai_meta` footer reflects the model used for the summary, not intent parsing. Source label changes automatically when Serper fallback is used.

Both providers unavailable:
```
→ Search tools are currently unavailable.

  Gemini 3 Flash — 23 remaining
```

---

## Section 11 — Conversational Chat

```
Tell me a joke

→ Why do programmers prefer dark mode? Because light attracts bugs.

  Gemini 3 Flash — 22 remaining
```

```
What is the capital of France?

→ Paris is the capital of France.

  Gemini 3 Flash — 21 remaining
```

Note: Current-events questions may be classified as `web_search` by the AI and trigger a Tavily call. This is correct behaviour.

---

## Section 12 — Delete Tasks (Owner only)

```
Delete the reminder to call dad

→ Deleted reminder: "call dad"

  Gemini 3 Flash — 20 remaining
```

```
Remove the routine to check server logs

→ Deleted routine: "check server logs"

  Gemini 3 Flash — 19 remaining
```

```
Delete Manu's birthday

→ Deleted event for: "Manu"

  Gemini 3 Flash — 18 remaining
```

Not found:
```
→ No task matching "buy milk" found.

  Gemini 3 Flash — 17 remaining
```

Guest attempt:
```
→ Access denied.

  Gemini 3 Flash — 17 remaining
```

---

## Section 13 — Address Book Query (Owner only)

```
What contacts do you have?

→ Address Book:

  - Dad
  - Manu
  - Mom

  Gemini 3 Flash — 16 remaining
```

---

## Section 14 — Save Contact (Owner only)

```
Save Manu as 919876543210

→ Contact saved: Manu — 919876543210

  Gemini 3 Flash — 15 remaining
```

```
Add Dad to contacts, his number is 91 98765 43210

→ Contact saved: Dad — 919876543210

  Gemini 3 Flash — 14 remaining
```

Spaces, dashes, and `+` are stripped automatically before saving. Saving a name that already exists updates the number rather than duplicating the entry.

Invalid number:
```
→ Please provide a valid phone number with country code.
```

Guest attempt:
```
→ Access denied.
```

---

## Section 15 — AI Fallback Chain

```
[Gemini at cap — Groq takes over]

Remind me at 5 PM to water the plants

→ Reminder set for 5:00 PM.

  Groq Llama 3.3 — 487 remaining
```

```
[Groq also exhausted — OpenRouter takes over]

→ Reminder set for 5:00 PM.

  OpenRouter GPT-4o-mini
```

```
[All tiers exhausted]

→ AI unavailable: All AI models are currently offline or daily limits have been reached.
```

---

## Summary Table

| Feature | Status | Notes |
| :--- | :--- | :--- |
| Greeting — owner | Working | |
| Greeting — guest/contact | Working | |
| `/limit` dashboard | Working | Groq included |
| One-off reminders | Working | |
| Relative time reminders | Working | AI calculates from IST context |
| Reminder for a contact | Working | Resolves phone via address book |
| Reminder without time | Working | Returns clarification prompt |
| Query reminders | Working | Owner only |
| Set daily routine | Working | Time displays as `9:00 AM` |
| Routine fires daily | Working | HH:mm prefix match |
| Query routines | Working | |
| Save birthday/event | Working | |
| Query birthday | Working | |
| Double-lock event alerts | Working | UTC edge case near midnight; safe at 08:30 |
| Schedule query | Working | |
| Instant message to contact | Working | |
| Forward to owner (guest) | Working | |
| Web search — Tavily | Working | Single message, correct model label in footer |
| Web search — Serper fallback | Working | Source label updates automatically |
| Both search engines down | Working | |
| Conversational chat | Working | |
| Delete reminder | Working | Owner only |
| Delete routine | Working | Owner only |
| Delete event | Working | Owner only |
| Nothing found to delete | Working | |
| Guest blocked from admin | Working | |
| Address book query | Working | Owner only |
| Save contact | Working | Owner only; upserts on name conflict |
| Gemini → Groq fallback | Working | |
| Groq → OpenRouter fallback | Working | |
| All models offline | Working | Graceful error message |
| Empty state on list queries | Working | Explicit null check, not string fallback |
| DB insert failure | Working | Returns error message to user |
| Webhook duplicate delivery | Known risk | No deduplication; acceptable for personal use |