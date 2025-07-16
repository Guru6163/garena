export type User = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
  is_active: boolean;
};

export type Game = {
  id: number;
  name: string;
  rate: number;
  rate_type: "30min" | "hour";
  is_active: boolean;
  created_at: string;
};

export type Session = {
  id: number;
  user_id: number;
  game_id: number;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  created_at: string;
  users?: User;
  games?: Game;
  // Add any additional fields used in the frontend (e.g., durationSec, price)
  durationSec?: number;
  price?: number;
  bill_details?: string | { total?: number; [key: string]: any };
}; 