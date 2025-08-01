export type User = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
  is_active: boolean;
};

export type GamePrice = {
  id: number;
  name: string;
  price: number;
};

export type Game = {
  id: number;
  title: string;
  is_active: boolean;
  created_at: string;
  prices: GamePrice[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type SessionProduct = {
  id: number;
  session_id: number;
  product_id: string;
  quantity: number;
  total_price: number;
  created_at: string;
  product?: Product;
};

export type Session = {
  id: number;
  user_id: number;
  game_id: number;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  created_at: string;
  
  // Database fields
  game_name?: string;
  game_rate?: number;
  game_rate_type?: string;
  game_rate_after_6pm?: number;
  game_rate_type_after_6pm?: string;
  bill_amount?: number;
  bill_details?: string;
  switch_pricing_at_6pm: boolean;
  
  // New billing fields
  has_dual_pricing?: boolean;
  pricing_overlaps_6pm?: boolean;
  duration_before_6pm_seconds?: number;
  duration_after_6pm_seconds?: number;
  amount_before_6pm?: number;
  amount_after_6pm?: number;
  extras_amount?: number;
  
  // Relations
  user?: User;
  game?: Game;
  extras?: SessionProduct[];
  
  // Computed fields (not stored in DB)
  durationSec?: number;
  price?: number;
}; 