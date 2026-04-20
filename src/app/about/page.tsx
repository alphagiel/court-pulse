"use client";

import { AppHeader } from "@/components/app-header";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-8 sm:px-6 space-y-8">
        <AppHeader title="About" backHref="/" />

        {/* What Court Pulse is */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Why Court Pulse?</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Tennis has always been competitive, but finding matches at your level can still feel random.
            You text the same three friends every weekend, or show up at a court hoping someone decent
            is around. Court Pulse fixes that. It gives your local tennis community a competitive ladder
            — propose matches, find opponents at your skill level, report scores, and track your rating
            over time.
          </p>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Whether you&apos;re a 2.5 NTRP looking for friendly competition or a 5.0 chasing the top spot,
            the goal is the same: build a local scene where everyone can find the right match, at the
            right level, any day of the week.
          </p>
        </section>

        {/* New player advice */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Getting Started</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            New here? Join the <span className="font-medium text-foreground">Ladder</span> — it&apos;s
            free, and you&apos;ll be placed in a tier that matches your skill level. From there, propose
            a match or accept someone else&apos;s challenge. Pick a park, set a time, and show up. After
            the match, both players report scores and your rating updates automatically. Play singles
            or doubles — each has its own separate rating.
          </p>
        </section>

        {/* Rating system */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">How Ratings Work</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Court Pulse uses the <span className="font-medium text-foreground">ELO rating system</span> —
            the same system used in chess since the 1960s and adopted by FIFA, the NBA, and nearly every
            competitive ranking you&apos;ve ever seen. It was created by physicist Arpad Elo to solve a simple
            problem: how do you measure the relative skill of players when they only play a handful of people?
            His answer was elegant — your rating goes up when you win and down when you lose, but by how much
            depends on who you played.
          </p>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Beat someone rated much higher than you? Your rating jumps. Lose to someone much lower? It
            drops hard. Beat someone at your level? A modest gain. This means every match matters, but no
            single match defines you. Over time, the math converges — your rating settles into a range that
            genuinely reflects your ability, regardless of who you happen to play. The more matches you play,
            the more accurate it gets.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Your Starting Rating</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            When you join the ladder, your initial ELO is seeded from your self-reported skill level:
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-1">
            {[
              ["2.5", "800"],
              ["3.0", "1,000"],
              ["3.5", "1,200"],
              ["4.0", "1,400"],
              ["4.5", "1,600"],
              ["5.0", "1,800"],
            ].map(([level, elo]) => (
              <div key={level} className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">{level} skill</span>
                <span className="font-medium">{elo}</span>
              </div>
            ))}
          </div>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            This is just a starting point. If you underrate yourself, you&apos;ll win matches and climb
            quickly. If you overrate yourself, you&apos;ll find your true level within a few games.
            The system is self-correcting — that&apos;s the beauty of ELO.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Singles &amp; Doubles Ratings</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Court Pulse tracks <span className="font-medium text-foreground">separate ratings</span> for
            singles and doubles, similar to how UTR handles it. Your singles ELO measures you head-to-head.
            Your doubles ELO reflects how you perform with a partner. They&apos;re independent — a 4.5 singles
            player might be a 4.0 in doubles or vice versa. In doubles, both teammates earn or lose the same
            points based on the team averages, so carrying a weaker partner is a real trade-off, and teams are
            auto-balanced to keep matches competitive.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Why ELO Over Self-Reported Levels?</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Self-reported skill levels (2.5, 3.0, 3.5, etc.) are useful as a rough starting point, but
            everyone interprets them differently. One player&apos;s 3.5 is another&apos;s 4.0. ELO removes the
            guesswork — it doesn&apos;t care what you think your level is, only what happens when you play.
            A 3.5 who consistently beats 4.0s will eventually be rated higher than those 4.0s. The number
            doesn&apos;t lie, and that&apos;s what makes matchmaking fair for everyone.
          </p>
        </section>

        {/* Sportsmanship */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Sportsmanship</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Court Pulse only works if we hold each other to a higher standard. Make honest line calls —
            if you&apos;re not sure, the ball was in. Report scores accurately and confirm promptly.
            Respect your opponents, win or lose. Introduce yourself to new players. Give the benefit of
            the doubt. The rating will sort itself out over time; your reputation is what sticks. Play
            hard, play fair, and leave the court better than you found it.
          </p>
        </section>

        <div className="pt-2">
          <hr className="border-border" />
          <p className="text-center text-[11px] text-muted-foreground/60 pt-4">
            &copy; 2026 Alpha DeAsis. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
