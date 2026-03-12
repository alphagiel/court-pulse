export type SkillLevel = "2.5" | "3.0" | "3.5" | "4.0" | "4.5" | "5.0";

export interface Park {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  court_count: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  skill_level: SkillLevel;
  preferred_park_id: string | null;
  created_at: string;
}

export interface Intent {
  id: string;
  user_id: string;
  park_id: string;
  skill_level: SkillLevel;
  target_time: string | null;
  created_at: string;
  expires_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  park_id: string;
  skill_level: SkillLevel;
  player_count: number;
  created_at: string;
  expires_at: string;
}

export interface IntentGroup {
  label: string; // "Now", "2 PM", "3 PM", etc.
  count: number;
  levels: string; // e.g. "3.0–4.5"
}

export type TimeBucket = "morning" | "afternoon" | "evening";

export interface IntentTimeBuckets {
  morning: number;   // before 12 PM
  afternoon: number; // 12 – 5 PM
  evening: number;   // 5 – 9 PM
}

// Aggregated view for the dashboard
export interface ParkActivity {
  park: Park;
  activeCheckIns: CheckIn[];
  activeIntents: Intent[];
  totalPlayers: number;
  totalInterested: number;
  intentGroups: IntentGroup[];
  intentTimeBuckets: IntentTimeBuckets;
  skillBreakdown: Record<SkillLevel, number>;
  lastActivity: string | null;
  distanceMiles: number | null;
}

// --- Ladder System ---

export type SkillTier = "beginner" | "intermediate" | "advanced";

export const SKILL_TIER_MAP: Record<SkillLevel, SkillTier> = {
  "2.5": "beginner",
  "3.0": "beginner",
  "3.5": "intermediate",
  "4.0": "intermediate",
  "4.5": "advanced",
  "5.0": "advanced",
};

export const SKILL_TIER_LABELS: Record<SkillTier, string> = {
  beginner: "Beginner (2.5–3.0)",
  intermediate: "Intermediate (3.5–4.0)",
  advanced: "Advanced (4.5–5.0)",
};

export const SKILL_TIER_LEVELS: Record<SkillTier, SkillLevel[]> = {
  beginner: ["2.5", "3.0"],
  intermediate: ["3.5", "4.0"],
  advanced: ["4.5", "5.0"],
};

export function getSkillTier(skill: SkillLevel): SkillTier {
  return SKILL_TIER_MAP[skill];
}

export type ProposalStatus = "open" | "forming" | "pairing" | "accepted" | "cancelled" | "expired";
export type MatchStatus = "pending" | "score_submitted" | "confirmed" | "disputed" | "cancelled";
export type MatchMode = "singles" | "doubles";
export type SignupRole = "creator" | "partner" | "opponent" | "opponent_partner";
export type Team = "a" | "b";

export interface LadderMember {
  id: string;
  user_id: string;
  season: string;
  status: "active" | "inactive";
  registered_at: string;
}

export interface Proposal {
  id: string;
  creator_id: string;
  park_id: string;
  proposed_time: string;
  message: string | null;
  status: ProposalStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  expires_at: string;
  // Doubles fields
  mode: MatchMode;
  partner_id: string | null;
  seeking_partner: boolean;
  acceptor_partner_id: string | null;
}

export interface Match {
  id: string;
  proposal_id: string;
  player1_id: string;
  player2_id: string;
  player1_scores: number[] | null;
  player2_scores: number[] | null;
  submitted_by: string | null;
  confirmed_by: string | null;
  status: MatchStatus;
  winner_id: string | null;
  played_at: string | null;
  created_at: string;
  // Doubles fields
  mode: MatchMode;
  player3_id: string | null;
  player4_id: string | null;
  winning_team: Team | null;
}

export interface ProposalSignup {
  id: string;
  proposal_id: string;
  user_id: string;
  role: SignupRole;
  team: Team | null;
  confirmed: boolean;
  joined_at: string;
}

export interface LadderRating {
  id: string;
  user_id: string;
  elo_rating: number;
  wins: number;
  losses: number;
  last_played: string | null;
  season: string;
  mode: MatchMode;
  updated_at: string;
}

export interface ProposalWithDetails extends Proposal {
  creator: Profile;
  acceptor: Profile | null;
  park: Park;
}

export interface MatchWithDetails extends Match {
  player1: Profile;
  player2: Profile;
  player3: Profile | null;
  player4: Profile | null;
  park: Park;
}

export interface ProposalSignupWithProfile extends ProposalSignup {
  profile: Profile;
}

export interface LadderRankEntry {
  rank: number;
  user_id: string;
  username: string;
  skill_level: SkillLevel;
  elo_rating: number;
  wins: number;
  losses: number;
  last_played: string | null;
}

export interface Database {
  public: {
    Tables: {
      parks: {
        Row: Park;
        Insert: Omit<Park, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Park, "id">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id">>;
      };
      intents: {
        Row: Intent;
        Insert: Omit<Intent, "id" | "created_at" | "expires_at"> & {
          id?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Omit<Intent, "id">>;
      };
      check_ins: {
        Row: CheckIn;
        Insert: Omit<CheckIn, "id" | "created_at" | "expires_at"> & {
          id?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Omit<CheckIn, "id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
