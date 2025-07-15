-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rate INTEGER NOT NULL,
  rate_type VARCHAR(10) NOT NULL CHECK (rate_type IN ('30min', 'hour')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO games (name, rate, rate_type) VALUES
('Cricket', 1400, 'hour'),
('Football', 800, '30min'),
('Basketball', 1200, 'hour')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, phone, email) VALUES
('John Doe', '9876543210', 'john@example.com'),
('Jane Smith', '9876543211', 'jane@example.com')
ON CONFLICT DO NOTHING;
