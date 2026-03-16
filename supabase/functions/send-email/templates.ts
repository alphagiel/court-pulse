// Base email template — green-themed, adapted from pickle-connect
export function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Court Pulse</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #16a34a; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Court Pulse
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 8px 0; color: #666666; font-size: 12px; line-height: 1.5;">
                You received this email because you have an account with Court Pulse.
              </p>
              <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.5;">
                <a href="https://court-pulse-raleigh.vercel.app/settings" style="color: #888888; text-decoration: underline;">Unsubscribe</a> or manage your email preferences.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function actionButton(text: string, url: string): string {
  return `
<table role="presentation" style="margin: 24px 0;">
  <tr>
    <td>
      <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`.trim();
}

function detailsBox(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (r) => `
      <p style="margin: 0 0 12px 0; color: #333333; font-size: 16px;">
        <strong>${r.label}:</strong> ${r.value}
      </p>`
    )
    .join("");
  return `
<table role="presentation" style="width: 100%; margin: 24px 0; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
  <tr>
    <td style="padding: 20px;">
      ${rowsHtml}
    </td>
  </tr>
</table>
`.trim();
}

// --- Email templates ---

export interface NewProposalData {
  creatorName: string;
  mode: "singles" | "doubles";
  parkName: string;
  dateTime: string;
  proposalUrl: string;
}

export function newProposalEmail(data: NewProposalData): { subject: string; html: string } {
  const modeLabel = data.mode === "doubles" ? "Doubles" : "Singles";
  const content = `
<h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 600;">
  New ${modeLabel} Proposal
</h2>

<p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  <strong>${data.creatorName}</strong> is looking for a ${modeLabel.toLowerCase()} match. Be the first to grab it!
</p>

${detailsBox([
  { label: "Location", value: data.parkName },
  { label: "When", value: data.dateTime },
])}

${actionButton("View Proposal", data.proposalUrl)}

<p style="margin: 0; color: #888888; font-size: 14px;">
  If the button doesn't work, copy and paste this link: ${data.proposalUrl}
</p>
`.trim();

  return {
    subject: `${data.creatorName} posted a ${modeLabel.toLowerCase()} proposal`,
    html: baseTemplate(content),
  };
}

export interface ProposalAcceptedData {
  creatorName: string;
  acceptedByName: string;
  parkName: string;
  dateTime: string;
  matchUrl: string;
}

export function proposalAcceptedEmail(data: ProposalAcceptedData): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 600;">
  Your Proposal Was Accepted!
</h2>

<p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  Great news, ${data.creatorName}! <strong>${data.acceptedByName}</strong> accepted your match proposal.
</p>

${detailsBox([
  { label: "Opponent", value: data.acceptedByName },
  { label: "Location", value: data.parkName },
  { label: "When", value: data.dateTime },
])}

<p style="margin: 0 0 24px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  Don't forget to record your match results afterward!
</p>

${actionButton("View Match", data.matchUrl)}
`.trim();

  return {
    subject: `${data.acceptedByName} accepted your match proposal!`,
    html: baseTemplate(content),
  };
}

export interface DoublesFilledData {
  playerName: string;
  playerNames: string[];
  parkName: string;
  dateTime: string;
  proposalUrl: string;
  isOrganizer: boolean;
}

export function doublesFilledEmail(data: DoublesFilledData): { subject: string; html: string } {
  const message = data.isOrganizer
    ? `All 4 players are in, ${data.playerName}. Time to arrange teams!`
    : `All 4 players are in, ${data.playerName}. The organizer will finalize the pairings.`;

  const buttonText = data.isOrganizer ? "Arrange Teams" : "View Pairings";

  const content = `
<h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 600;">
  Your Doubles Match Is Full!
</h2>

<p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  ${message}
</p>

${detailsBox([
  { label: "Players", value: data.playerNames.join(", ") },
  { label: "Location", value: data.parkName },
  { label: "When", value: data.dateTime },
])}

${actionButton(buttonText, data.proposalUrl)}
`.trim();

  return {
    subject: "Your doubles match is full!",
    html: baseTemplate(content),
  };
}

export interface PartnerInviteData {
  invitedName: string;
  creatorName: string;
  parkName: string;
  dateTime: string;
  proposalUrl: string;
}

export function partnerInviteEmail(data: PartnerInviteData): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 600;">
  You've Been Invited as a Partner
</h2>

<p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  ${data.invitedName}, <strong>${data.creatorName}</strong> wants you on their team for doubles!
</p>

${detailsBox([
  { label: "Organizer", value: data.creatorName },
  { label: "Location", value: data.parkName },
  { label: "When", value: data.dateTime },
])}

${actionButton("Accept or Decline", data.proposalUrl)}
`.trim();

  return {
    subject: `${data.creatorName} wants you as their doubles partner`,
    html: baseTemplate(content),
  };
}

export interface PlayerLeftData {
  organizerName: string;
  playerName: string;
  parkName: string;
  dateTime: string;
  proposalUrl: string;
}

export function playerLeftEmail(data: PlayerLeftData): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 600;">
  A Player Left Your Doubles Match
</h2>

<p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  ${data.organizerName}, <strong>${data.playerName}</strong> has left your doubles proposal. You're now waiting for a replacement.
</p>

${detailsBox([
  { label: "Location", value: data.parkName },
  { label: "When", value: data.dateTime },
])}

${actionButton("View Proposal", data.proposalUrl)}
`.trim();

  return {
    subject: `${data.playerName} left your doubles match`,
    html: baseTemplate(content),
  };
}

export interface FeedbackReplyData {
  userName: string;
  originalMessage: string;
  adminReply: string;
  appUrl: string;
}

export function feedbackReplyEmail(data: FeedbackReplyData): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 600;">
  Reply to Your Feedback
</h2>

<p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  Hey ${data.userName}, thanks for your feedback! Here's a reply from the Court Pulse team:
</p>

<table role="presentation" style="width: 100%; margin: 24px 0; background-color: #f5f3ff; border-radius: 8px; border: 1px solid #ddd6fe;">
  <tr>
    <td style="padding: 20px;">
      <p style="margin: 0 0 12px 0; color: #888888; font-size: 13px; font-style: italic;">
        Your message: "${data.originalMessage.length > 200 ? data.originalMessage.slice(0, 200) + "..." : data.originalMessage}"
      </p>
      <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
        ${data.adminReply}
      </p>
    </td>
  </tr>
</table>

${actionButton("Open Court Pulse", data.appUrl)}
`.trim();

  return {
    subject: "Reply to your feedback — Court Pulse",
    html: baseTemplate(content),
  };
}

export interface MatchDisputedData {
  submitterName: string;
  disputerName: string;
  matchUrl: string;
}

export function matchDisputedEmail(data: MatchDisputedData): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 600;">
  Match Scores Disputed
</h2>

<p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
  ${data.submitterName}, <strong>${data.disputerName}</strong> has disputed the scores you submitted. Please review and resubmit.
</p>

${actionButton("Review Match", data.matchUrl)}
`.trim();

  return {
    subject: `${data.disputerName} disputed your match scores`,
    html: baseTemplate(content),
  };
}
