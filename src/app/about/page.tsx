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
            Pickleball is one of the fastest-growing sports in the country, but finding people to play
            with can still feel random. You drive to a park hoping courts are open, or you text the same
            three friends every weekend. Court Pulse fixes that. It gives your local pickleball community
            a shared pulse — a live view of who&apos;s playing where, when, and at what level — so you
            spend less time looking for a game and more time on the court.
          </p>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Beyond pickup, Court Pulse offers a competitive ladder where players can schedule matches,
            report scores, and track their rating over time. Whether you&apos;re a casual 2.5 looking for a
            friendly rally or a 5.0 chasing the top spot, the goal is the same: build a local scene where
            everyone can find the right game, at the right level, any day of the week.
          </p>
        </section>

        {/* New player advice */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Getting Started</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            New here? Start with <span className="font-medium text-foreground">Pickup</span> — tap
            &ldquo;I&apos;m Down to Play,&rdquo; pick a court and a time, and your signal goes out
            anonymously. Only your skill level and location are shared, never your name. Check nearby
            courts to see who else is heading out and pick the spot with the most action. When
            you&apos;re ready for something more structured, join
            the <span className="font-medium text-foreground">Ladder</span> — it&apos;s free, and
            you&apos;ll be placed in a tier that matches your skill level.
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
