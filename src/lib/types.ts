/**
 * Shared types for the DotFuel data model.
 * Matches the Supabase Postgres schema used by the webapp.
 */

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  age?: number;
  sex?: 'male' | 'female';
  weight_kg?: number;
  height_cm?: number;
  activity_level?: string;
  fuel_mode?: string;
  calorie_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
  water_goal_ml?: number;
  streak_days?: number;
  best_streak?: number;
  total_logged_days?: number;
  avatar_url?: string;
  push_token?: string;
  created_at?: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber?: number;
  water_ml?: number;
  fuel_score?: number;
  burned_calories?: number;
  created_at?: string;
}

export interface Meal {
  id: string;
  user_id: string;
  daily_log_id: string;
  name: string;
  emoji?: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  serving_size?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  source?: string; // 'manual' | 'fatsecret' | 'ai' | 'barcode' | 'voice' | 'photo'
  photo_url?: string;
  created_at?: string;
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  daily_log_id: string;
  name: string;
  emoji?: string;
  calories_burned: number;
  duration_min?: number;
  source?: string;
  created_at?: string;
}

export interface CustomFood {
  id: string;
  user_id: string;
  name: string;
  emoji?: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  serving_size?: string;
  created_at?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  max_participants?: number;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  progress?: number;
  joined_at?: string;
}

export interface DotDuoProfile {
  id: string;
  user_id: string;
  goal: string;
  diet: string;
  vibe: string;
  gender: string;
  partner_gender: string;
  is_looking: boolean;
  partner_id?: string;
  created_at?: string;
}

export interface DotDuoMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export type FuelMode = 'cut' | 'lean' | 'balance' | 'clean' | 'perform';

export const FUEL_MODES: Record<FuelMode, { label: string; emoji: string; tag: string; color: string }> = {
  cut: { label: 'Cut', emoji: '🔥', tag: 'deficit', color: '#FF3B3B' },
  lean: { label: 'Lean Bulk', emoji: '💪', tag: 'surplus', color: '#6fa3ff' },
  balance: { label: 'Balance', emoji: '⚖️', tag: 'maintain', color: '#C2F000' },
  clean: { label: 'Clean', emoji: '🥗', tag: 'clean', color: '#00E87A' },
  perform: { label: 'Perform', emoji: '⚡', tag: 'perform', color: '#FF8C00' },
};

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', emoji: '🪑', desc: 'Little or no exercise', mult: 1.2 },
  { id: 'light', label: 'Light', emoji: '🚶', desc: '1-3 days/week', mult: 1.375 },
  { id: 'moderate', label: 'Moderate', emoji: '🏃', desc: '3-5 days/week', mult: 1.55 },
  { id: 'active', label: 'Active', emoji: '🏋️', desc: '6-7 days/week', mult: 1.725 },
  { id: 'athlete', label: 'Athlete', emoji: '🏆', desc: 'Twice/day training', mult: 1.9 },
] as const;
