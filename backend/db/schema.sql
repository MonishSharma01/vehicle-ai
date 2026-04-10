-- ============================================================
-- Vehicle AI — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users (extended with auth fields) ──────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              TEXT    NOT NULL,
    car_model         TEXT    NOT NULL DEFAULT '',
    car_number_plate  TEXT    NOT NULL DEFAULT '',
    phone             TEXT    DEFAULT '',
    email             TEXT    DEFAULT '',
    password_hash     TEXT    NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL AND email != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL AND phone != '';

-- ── vehicles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
    id           TEXT PRIMARY KEY,          -- e.g. "V001"
    owner_name   TEXT    NOT NULL,
    owner_phone  TEXT    NOT NULL,
    model        TEXT    NOT NULL,
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    active       BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── garages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garages (
    id               TEXT PRIMARY KEY,      -- e.g. "G001"
    name             TEXT    NOT NULL,
    address          TEXT    NOT NULL,
    phone            TEXT    NOT NULL,
    lat              DOUBLE PRECISION NOT NULL,
    lon              DOUBLE PRECISION NOT NULL,
    rating           NUMERIC(3,1) NOT NULL,
    specializations  TEXT[]  NOT NULL DEFAULT '{}',
    available_slots  INT     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── garage_pricing ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garage_pricing (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garage_id       TEXT NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    issue_type      TEXT NOT NULL,
    service_name    TEXT NOT NULL,
    base_cost_inr   INT  NOT NULL,
    duration_mins   INT  NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (garage_id, issue_type)
);

-- ── telemetry_logs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id       TEXT REFERENCES vehicles(id),
    engine_temp      NUMERIC(6,2),
    battery_voltage  NUMERIC(5,2),
    oil_life         NUMERIC(5,2),
    vibration        NUMERIC(5,2),
    mileage          INT,
    predicted_issue  TEXT,
    confidence       NUMERIC(5,4),
    recorded_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_id ON telemetry_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON telemetry_logs(recorded_at DESC);

-- ── issues (service requests) ────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
    id             TEXT PRIMARY KEY,         -- e.g. "A1B2C3D4"
    vehicle_id     TEXT REFERENCES vehicles(id),
    prediction     TEXT NOT NULL,
    confidence     NUMERIC(5,4) NOT NULL,
    probabilities  JSONB,
    urgency        TEXT NOT NULL,
    status         TEXT NOT NULL,
    garages_tried  TEXT[] DEFAULT '{}',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_vehicle_id ON issues(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_issues_status     ON issues(status);

-- ── bookings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id              TEXT PRIMARY KEY,        -- e.g. "BK001234"
    vehicle_id      TEXT REFERENCES vehicles(id),
    garage_id       TEXT REFERENCES garages(id),
    request_id      TEXT REFERENCES issues(id),
    issue_type      TEXT NOT NULL,
    service         TEXT NOT NULL,
    estimated_cost  TEXT NOT NULL,
    urgency         TEXT NOT NULL,
    status          TEXT NOT NULL,           -- PENDING_GARAGE | AWAITING_USER | IN_PROGRESS | COMPLETED | CANCELLED
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id  ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_garage_id   ON bookings(garage_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);

-- ── booking_status (audit trail of status transitions) ───────
CREATE TABLE IF NOT EXISTS booking_status (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_status  TEXT,
    new_status  TEXT NOT NULL,
    changed_by  TEXT,                        -- "garage" | "user" | "system"
    notes       TEXT,
    changed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_booking ON booking_status(booking_id);

-- ── feedback ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id   TEXT NOT NULL REFERENCES bookings(id),
    vehicle_id   TEXT REFERENCES vehicles(id),
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_booking_id ON feedback(booking_id);

-- ── insights ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insights (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type   TEXT NOT NULL,
    data           JSONB NOT NULL,
    generated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_type        ON insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_generated   ON insights(generated_at DESC);

-- ── agent_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name   TEXT NOT NULL,
    action       TEXT NOT NULL,
    entity_id    TEXT,
    details      JSONB DEFAULT '{}',
    timestamp    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent  ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_time   ON agent_logs(timestamp DESC);

-- ── Row Level Security ────────────────────────────────────────
-- Anon key has read + write access for all tables used by the backend.
-- In production, restrict these policies and use a service_role key
-- for backend writes, keeping the anon key read-only.

ALTER TABLE vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE garages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE garage_pricing   ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs       ENABLE ROW LEVEL SECURITY;

-- Allow anon full access (demo / development). Tighten in production.
DO $$
DECLARE
    tbl TEXT;
    pol TEXT;
    tables TEXT[] := ARRAY[
        'vehicles','garages','garage_pricing','telemetry_logs',
        'issues','bookings','booking_status','feedback','insights','agent_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        pol := 'anon_all_' || tbl;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename  = tbl
              AND policyname = pol
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
                pol, tbl
            );
        END IF;
    END LOOP;
END
$$;

-- ── Seed default garages ─────────────────────────────────────
INSERT INTO garages (id, name, address, phone, lat, lon, rating, specializations, available_slots)
VALUES
  ('G001', 'AutoCare Downtown',  '123 Main St',     '555-5001', 28.6140, 77.2095, 4.8, ARRAY['battery','engine','oil'],  5),
  ('G002', 'QuickFix Motors',    '45 Ring Road',    '555-5002', 28.6300, 77.2300, 4.3, ARRAY['battery','oil'],           3),
  ('G003', 'SpeedGarage Pro',    '7 Industrial Rd', '555-5003', 28.5900, 77.1800, 4.6, ARRAY['engine','general'],        4),
  ('G004', 'CityMech Service',   '88 North Ave',    '555-5004', 28.6500, 77.2400, 3.9, ARRAY['oil','general'],           2),
  ('G005', 'PrimeAuto Workshop', '21 South Blvd',   '555-5005', 28.5800, 77.2100, 4.1, ARRAY['battery','general'],       6)
ON CONFLICT (id) DO NOTHING;

-- ── Seed default vehicles ────────────────────────────────────
INSERT INTO vehicles (id, owner_name, owner_phone, model, lat, lon)
VALUES
  ('V001', 'Alice Johnson', '555-1001', 'Tesla Model 3', 28.6139, 77.2090),
  ('V002', 'Bob Smith',     '555-1002', 'Honda City',    28.6200, 77.2200),
  ('V003', 'Carol Lee',     '555-1003', 'Ford Mustang',  28.6000, 77.1900)
ON CONFLICT (id) DO NOTHING;

-- ── Default garage pricing ────────────────────────────────────
INSERT INTO garage_pricing (garage_id, issue_type, service_name, base_cost_inr, duration_mins)
VALUES
  ('G001','battery_failure','Battery Replacement',4000,30),
  ('G001','engine_overheat','Engine Cooling Service',7500,45),
  ('G001','low_oil_life',   'Oil Change',1500,20),
  ('G002','battery_failure','Battery Replacement',3800,30),
  ('G002','low_oil_life',   'Oil Change',1400,20),
  ('G003','engine_overheat','Engine Cooling Service',7000,45),
  ('G003','low_oil_life',   'Oil Change',1600,20),
  ('G004','low_oil_life',   'Oil Change',1300,20),
  ('G005','battery_failure','Battery Replacement',4200,35)
ON CONFLICT (garage_id, issue_type) DO NOTHING;

-- ── garages_auth (registered garages with auth) ──────────────
CREATE TABLE IF NOT EXISTS garages_auth (
    id              TEXT PRIMARY KEY,              -- e.g. "GA1A2B3C4"
    garage_name     TEXT    NOT NULL,
    owner_name      TEXT    NOT NULL,
    phone           TEXT    UNIQUE NOT NULL,
    email           TEXT    DEFAULT '',
    location        TEXT    NOT NULL,
    specialization  TEXT    NOT NULL DEFAULT 'general',
    rating          NUMERIC(3,1) DEFAULT 0.0,
    password_hash   TEXT    NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garages_auth_phone ON garages_auth(phone);
CREATE INDEX IF NOT EXISTS idx_garages_auth_email ON garages_auth(email);

-- ── analytics (ML detection events for charts) ────────────────
CREATE TABLE IF NOT EXISTS analytics (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_model     TEXT    NOT NULL,
    issue_type    TEXT    NOT NULL,
    garage_id     TEXT    REFERENCES garages(id) ON DELETE SET NULL,
    confidence    NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    timestamp     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_issue_type ON analytics(issue_type);
CREATE INDEX IF NOT EXISTS idx_analytics_car_model  ON analytics(car_model);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp  ON analytics(timestamp DESC);

-- Enable RLS for new tables
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE garages_auth  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics     ENABLE ROW LEVEL SECURITY;

-- Allow anon full access for new tables (demo). Tighten in production.
DO $$
DECLARE
    tbl TEXT;
    pol TEXT;
    new_tables TEXT[] := ARRAY['users','garages_auth','analytics'];
BEGIN
    FOREACH tbl IN ARRAY new_tables LOOP
        pol := 'anon_all_' || tbl;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename  = tbl
              AND policyname = pol
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
                pol, tbl
            );
        END IF;
    END LOOP;
END
$$;
