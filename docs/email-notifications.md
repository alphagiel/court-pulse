# Email Notifications Plan

## Tech Stack

- **Provider:** Resend (free tier: 100 emails/day, 3,000/month)
- **Trigger:** Supabase Edge Functions (Deno runtime)
- **Events:** Database webhooks on table changes
- **Sending domain:** `send.pickleconnect.club` (reused from pickle-connect, Cloudflare DNS)
- **From address:** `noreply@send.pickleconnect.club`

---

## Phase 1 (current)

### A. Make the sign-up/reset emails look good

Right now Supabase sends bland default emails for auth events. We plug in Resend's SMTP
so those emails come from `pickleconnect.club` with a branded green theme.

- Configure Resend SMTP in Supabase dashboard (Auth > SMTP settings)
- Customize auth email templates (confirm signup, password reset) with green-themed HTML
- Emails affected: confirm signup, password reset, magic link (if used)

### B. 5 "something happened" emails

| # | Event | Who gets emailed | Plain English |
|---|-------|-----------------|---------------|
| 1 | New proposal created | All players in same tier + mode | Someone posted a match — grab it before it's gone |
| 2 | Proposal accepted (singles) | Proposal creator | Your match is locked in |
| 3 | Doubles proposal filled (4/4) | All 4 players | Full lobby — go arrange teams |
| 4 | Partner invitation | Invited player | Someone picked you as their partner — accept or decline |
| 5 | Match disputed | Score submitter | Opponent rejected scores — go resubmit |

### C. The plumbing

- **Edge Function:** A small server function inside Supabase (Deno) that sends emails via Resend
- **Database webhooks:** "Tripwires" on the database — when a row changes (proposal created, match disputed, etc.), it automatically calls the edge function
- **Sending domain:** Reuse `send.pickleconnect.club` already configured in Cloudflare + Resend
- **Spam prevention:** If 5 proposals get created in 10 minutes, a user gets 1 email, not 5 (hourly throttle per user)
- **Active users only:** Only email users active in last 7 days

### C. Infrastructure details

- First Supabase Edge Function for this project (`supabase/functions/send-email/`)
- Resend API key stored in Supabase secrets
- HTML email templates reusing green theme from pickle-connect base template
- `email_throttle` table to track last-sent timestamps per user per event type

---

## Phase 2 (later): Daily Digest

Lower urgency events batched into one email per user per day.

| Event | Recipient |
|-------|-----------|
| Score submitted (awaiting confirmation) | Other player(s) |
| Score confirmed (final result) | All match players |
| Player joined your doubles (2/4, 3/4) | Organizer only |

Implementation:
1. `email_digest_queue` table to accumulate events throughout the day
2. Edge Function `send-daily-digest` triggered by pg_cron once daily
3. Aggregate queued events per user, render single digest email, send via Resend

---

## Phase 3 (future): Preferences

- `email_preferences` column on profiles (or separate table)
- Settings page in app for users to toggle notification types
- Check preferences before sending any email

---

## No Email (never)

- Proposal cancelled or expired
- Ranking / ELO changes

---

## Cost Controls

1. Throttle "new proposal" fan-out: max 1 email per user per hour
2. Only email users active in last 7 days
3. User opt-in/out preference (Phase 3)
4. Resend free tier (100/day, 3,000/month) should be sufficient for early growth
