import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  newProposalEmail,
  proposalAcceptedEmail,
  doublesFilledEmail,
  partnerInviteEmail,
  playerLeftEmail,
  matchDisputedEmail,
  feedbackReplyEmail,
} from "./templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "Court Pulse <noreply@send.pickleconnect.club>";
const APP_URL = "https://court-pulse-raleigh.vercel.app";

// Throttle window for new-proposal fan-out (ms)
const THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Helpers ---

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const tz = "America/New_York";
  return (
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })
  );
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<${APP_URL}/settings>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error for ${to}: ${err}`);
    return false;
  }
  return true;
}

async function getProfile(userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

async function getPark(parkId: string) {
  const { data } = await supabase.from("parks").select("*").eq("id", parkId).single();
  return data;
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email || null;
}

type EmailCategory = "singles" | "doubles" | "digest";

async function isOptedOut(userId: string, category: EmailCategory): Promise<boolean> {
  const { data } = await supabase
    .from("email_preferences")
    .select("all_emails, singles_emails, doubles_emails, digest_emails")
    .eq("user_id", userId)
    .single();

  // No row = default (all on)
  if (!data) return false;

  // Master kill switch
  if (!data.all_emails) return true;

  if (category === "singles") return !data.singles_emails;
  if (category === "doubles") return !data.doubles_emails;
  if (category === "digest") return !data.digest_emails;
  return false;
}

async function isThrottled(userId: string, eventType: string): Promise<boolean> {
  const { data } = await supabase
    .from("email_throttle")
    .select("last_sent_at")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .single();

  if (!data) return false;

  const lastSent = new Date(data.last_sent_at).getTime();
  return Date.now() - lastSent < THROTTLE_WINDOW_MS;
}

async function recordThrottle(userId: string, eventType: string) {
  await supabase.from("email_throttle").upsert(
    { user_id: userId, event_type: eventType, last_sent_at: new Date().toISOString() },
    { onConflict: "user_id,event_type" }
  );
}

async function getTierPlayerIds(creatorId: string): Promise<string[]> {
  const creator = await getProfile(creatorId);
  if (!creator) return [];

  const tierMap: Record<string, string[]> = {
    "2.5": ["2.5", "3.0"],
    "3.0": ["2.5", "3.0"],
    "3.5": ["3.5", "4.0"],
    "4.0": ["3.5", "4.0"],
    "4.5": ["4.5", "5.0"],
    "5.0": ["4.5", "5.0"],
  };

  const tierLevels = tierMap[String(creator.skill_level)] || [];
  if (tierLevels.length === 0) return [];

  const { data: members } = await supabase
    .from("ladder_members")
    .select("user_id")
    .eq("status", "active");

  if (!members) return [];

  const memberIds = members.map((m: { user_id: string }) => m.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, skill_level")
    .in("id", memberIds)
    .in("skill_level", tierLevels);

  if (!profiles) return [];

  return profiles
    .map((p: { id: string }) => p.id)
    .filter((id: string) => id !== creatorId);
}

// --- Event handlers ---

async function handleProposalCreated(record: Record<string, unknown>) {
  // Re-fetch proposal from DB — webhook payload may not include all columns (e.g. mode)
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", record.id as string)
    .single();

  const fresh = proposal || record;
  const creator = await getProfile(fresh.creator_id as string);
  const park = await getPark(fresh.park_id as string);
  if (!creator || !park) return;

  const mode = (fresh.mode as string) || "singles";
  const playerIds = await getTierPlayerIds(fresh.creator_id as string);

  // Singles proposals are handled inline on the ladder page; doubles have a detail page
  const proposalUrl = mode === "doubles"
    ? `${APP_URL}/ladder/proposals/${fresh.id}?mode=doubles`
    : `${APP_URL}/ladder?tab=proposals`;
  const { subject, html } = newProposalEmail({
    creatorName: creator.username,
    mode: mode as "singles" | "doubles",
    parkName: park.name,
    dateTime: formatDateTime(fresh.proposed_time as string),
    proposalUrl,
  });

  const category: EmailCategory = mode === "doubles" ? "doubles" : "singles";

  let sent = 0;
  for (const playerId of playerIds) {
    if (await isOptedOut(playerId, category)) continue;
    if (await isThrottled(playerId, "new_proposal")) continue;

    const email = await getUserEmail(playerId);
    if (!email) continue;

    // Rate limit: Resend free tier allows 2 req/sec
    if (sent > 0) await new Promise((r) => setTimeout(r, 600));

    const ok = await sendEmail(email, subject, html);
    if (ok) {
      await recordThrottle(playerId, "new_proposal");
      sent++;
    }
  }

  console.log(`proposal_created: notified ${sent}/${playerIds.length} tier players`);
}

async function handleProposalAccepted(record: Record<string, unknown>) {
  const creator = await getProfile(record.creator_id as string);
  const acceptor = await getProfile(record.accepted_by as string);
  const park = await getPark(record.park_id as string);
  if (!creator || !acceptor || !park) return;

  if (await isOptedOut(record.creator_id as string, "singles")) return;

  const creatorEmail = await getUserEmail(record.creator_id as string);
  if (!creatorEmail) return;

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("proposal_id", record.id as string)
    .single();

  const matchUrl = match
    ? `${APP_URL}/ladder/match/${match.id}`
    : `${APP_URL}/ladder`;

  const { subject, html } = proposalAcceptedEmail({
    creatorName: creator.username,
    acceptedByName: acceptor.username,
    parkName: park.name,
    dateTime: formatDateTime(record.proposed_time as string),
    matchUrl,
  });

  await sendEmail(creatorEmail, subject, html);
  console.log(`proposal_accepted: notified creator ${creator.username}`);
}

async function handleDoublesFilled(record: Record<string, unknown>) {
  const proposalId = record.id as string;
  const park = await getPark(record.park_id as string);
  if (!park) return;

  const { data: signups } = await supabase
    .from("proposal_signups")
    .select("user_id")
    .eq("proposal_id", proposalId);

  if (!signups || signups.length < 4) return;

  const playerIds = signups.map((s: { user_id: string }) => s.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", playerIds);

  if (!profiles) return;

  const profileMap = new Map(profiles.map((p: { id: string; username: string }) => [p.id, p.username]));
  const allNames = playerIds.map((id: string) => profileMap.get(id) || "?");

  const proposalUrl = `${APP_URL}/ladder/proposals/${proposalId}?mode=doubles`;
  const creatorId = record.creator_id as string;
  const organizerName = profileMap.get(creatorId) || "The organizer";

  let sent = 0;
  for (const playerId of playerIds) {
    if (await isOptedOut(playerId, "doubles")) continue;

    const email = await getUserEmail(playerId);
    if (!email) continue;

    // Rate limit: Resend free tier allows 2 req/sec
    if (sent > 0) await new Promise((r) => setTimeout(r, 600));

    const playerName = profileMap.get(playerId) || "Player";
    const { subject, html } = doublesFilledEmail({
      playerName,
      playerNames: allNames,
      organizerName,
      parkName: park.name,
      dateTime: formatDateTime(record.proposed_time as string),
      proposalUrl,
      isOrganizer: playerId === creatorId,
    });

    await sendEmail(email, subject, html);
    sent++;
  }

  console.log(`doubles_filled: notified ${sent}/${playerIds.length} players`);
}

async function handlePartnerInvited(record: Record<string, unknown>) {
  const partnerId = record.partner_id as string;
  if (!partnerId) return;

  const creator = await getProfile(record.creator_id as string);
  const partner = await getProfile(partnerId);
  const park = await getPark(record.park_id as string);
  if (!creator || !partner || !park) return;

  if (await isOptedOut(partnerId, "doubles")) return;

  const partnerEmail = await getUserEmail(partnerId);
  if (!partnerEmail) return;

  const proposalUrl = `${APP_URL}/ladder/proposals/${record.id}?mode=doubles`;

  const { subject, html } = partnerInviteEmail({
    invitedName: partner.username,
    creatorName: creator.username,
    parkName: park.name,
    dateTime: formatDateTime(record.proposed_time as string),
    proposalUrl,
  });

  await sendEmail(partnerEmail, subject, html);
  console.log(`partner_invited: notified ${partner.username}`);
}

async function handlePlayerLeft(record: Record<string, unknown>, oldRecord: Record<string, unknown>) {
  // Only notify when status drops FROM pairing back to forming
  if (oldRecord.status !== "pairing" && oldRecord.status !== "forming") return;

  const creatorId = record.creator_id as string;
  const creator = await getProfile(creatorId);
  const park = await getPark(record.park_id as string);
  if (!creator || !park) return;

  if (await isOptedOut(creatorId, "doubles")) return;

  const creatorEmail = await getUserEmail(creatorId);
  if (!creatorEmail) return;

  // Figure out who left by comparing old signups — we can't easily diff here,
  // so just send a generic "a player left" message
  const { subject, html } = playerLeftEmail({
    organizerName: creator.username,
    playerName: "A player",
    parkName: park.name,
    dateTime: formatDateTime(record.proposed_time as string),
    proposalUrl: `${APP_URL}/ladder/proposals/${record.id}?mode=doubles`,
  });

  await sendEmail(creatorEmail, subject, html);
  console.log(`player_left: notified organizer ${creator.username}`);
}

async function handleMatchDisputed(record: Record<string, unknown>) {
  const submittedBy = record.submitted_by as string;
  if (!submittedBy) return;

  const submitter = await getProfile(submittedBy);
  const players = [record.player1_id as string, record.player2_id as string];
  if (record.player3_id) players.push(record.player3_id as string);
  if (record.player4_id) players.push(record.player4_id as string);
  const disputerId = players.find((id) => id !== submittedBy);
  const disputer = disputerId ? await getProfile(disputerId) : null;

  if (!submitter) return;

  const matchCategory: EmailCategory = record.player3_id ? "doubles" : "singles";
  if (await isOptedOut(submittedBy, matchCategory)) return;

  const submitterEmail = await getUserEmail(submittedBy);
  if (!submitterEmail) return;

  const matchUrl = `${APP_URL}/ladder/match/${record.id}`;

  const { subject, html } = matchDisputedEmail({
    submitterName: submitter.username,
    disputerName: disputer?.username || "Your opponent",
    matchUrl,
  });

  await sendEmail(submitterEmail, subject, html);
  console.log(`match_disputed: notified submitter ${submitter.username}`);
}

// --- Feedback reply handler ---

async function handleFeedbackReply(payload: { user_id: string; admin_reply: string; feedback_id: string }) {
  const profile = await getProfile(payload.user_id);
  if (!profile) return;

  const email = await getUserEmail(payload.user_id);
  if (!email) return;

  // Get original feedback message
  const { data: feedback } = await supabase
    .from("feedback")
    .select("message")
    .eq("id", payload.feedback_id)
    .single();

  const { subject, html } = feedbackReplyEmail({
    userName: profile.username,
    originalMessage: feedback?.message || "",
    adminReply: payload.admin_reply,
    appUrl: APP_URL,
  });

  const ok = await sendEmail(email, subject, html);
  console.log(`feedback_reply: ${ok ? "sent" : "failed"} to ${profile.username}`);
}

// --- Main handler ---
// Receives Supabase Database Webhook payloads or direct invocations

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();

    // Direct invocation for feedback reply
    if (payload.type === "feedback_reply") {
      await handleFeedbackReply(payload);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { type, table, record, old_record } = payload;

    console.log(`Webhook: ${type} on ${table}`);

    // --- Proposals table ---
    if (table === "proposals") {
      // New proposal created (singles start as "open", doubles start as "forming")
      if (type === "INSERT" && (record.status === "open" || record.status === "forming")) {
        await handleProposalCreated(record);
      }

      // Proposal updated
      if (type === "UPDATE") {
        // Singles accepted
        if (
          record.mode === "singles" &&
          record.status === "accepted" &&
          old_record?.status !== "accepted"
        ) {
          await handleProposalAccepted(record);
        }

        // Doubles filled (moved to pairing)
        if (
          record.mode === "doubles" &&
          record.status === "pairing" &&
          old_record?.status !== "pairing"
        ) {
          await handleDoublesFilled(record);
        }

        // Partner invited
        if (record.partner_id && !old_record?.partner_id) {
          await handlePartnerInvited(record);
        }

        // Player left doubles (status actually dropped)
        if (
          record.mode === "doubles" &&
          record.status !== old_record?.status &&
          (record.status === "forming" || record.status === "open") &&
          (old_record?.status === "pairing" || old_record?.status === "forming")
        ) {
          await handlePlayerLeft(record, old_record);
        }
      }
    }

    // --- Matches table ---
    if (table === "matches") {
      // Match disputed
      if (
        type === "UPDATE" &&
        record.status === "disputed" &&
        old_record?.status !== "disputed"
      ) {
        await handleMatchDisputed(record);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
