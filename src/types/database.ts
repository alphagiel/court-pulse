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
