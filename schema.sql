-- Database schema for Coffee Machine Service & Sales

-- Clean up existing relations to allow schema updates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS repairs;
DROP TABLE IF EXISTS machines_for_sale;
DROP TABLE IF EXISTS profiles;
DROP TYPE IF EXISTS appointment_status;
DROP TYPE IF EXISTS repair_status;
DROP TYPE IF EXISTS machine_sale_status;

-- Profiles for registered users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Appointments table
CREATE TYPE appointment_status AS ENUM ('függőben', 'visszaigazolva', 'lemondva');
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  machine_model TEXT NOT NULL,
  description TEXT,
  requested_date TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'függőben' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Repairs table
CREATE TYPE repair_status AS ENUM ('beérkezett', 'javítás alatt', 'alkatrészre vár', 'kész', 'átadva');
CREATE TABLE repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  machine_model TEXT NOT NULL,
  error_description TEXT,
  status repair_status DEFAULT 'beérkezett' NOT NULL,
  estimated_completion DATE,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Machines for sale table
CREATE TYPE machine_sale_status AS ENUM ('elérhető', 'eladva');
CREATE TABLE machines_for_sale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  status machine_sale_status DEFAULT 'elérhető' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines_for_sale ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure a clean state and prevent recursion
DO $$ 
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Users can see their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    DROP POLICY IF EXISTS "Admins can see all profiles" ON profiles;
    
    -- Appointments
    DROP POLICY IF EXISTS "Guests can create appointments" ON appointments;
    DROP POLICY IF EXISTS "Users can see their own appointments" ON appointments;
    DROP POLICY IF EXISTS "Admins full access appointments" ON appointments;
    
    -- Repairs
    DROP POLICY IF EXISTS "Public repair lookup by ID" ON repairs;
    DROP POLICY IF EXISTS "Users can see their linked repairs" ON repairs;
    DROP POLICY IF EXISTS "Admins full access repairs" ON repairs;
    
    -- Machines
    DROP POLICY IF EXISTS "Public machine view" ON machines_for_sale;
    DROP POLICY IF EXISTS "Admins full access machines" ON machines_for_sale;
END $$;

-- Profiles Policies
CREATE POLICY "Users can see their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (
  auth.uid() = id AND 
  (is_admin = false OR (auth.jwt() ->> 'email') = 'muczajanos7@gmail.com')
);
CREATE POLICY "Admins can see all profiles" ON profiles FOR SELECT USING ((auth.jwt() ->> 'email') = 'muczajanos7@gmail.com');

-- Appointments Policies
CREATE POLICY "Guests can create appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can see their own appointments" ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins full access appointments" ON appointments USING ((auth.jwt() ->> 'email') = 'muczajanos7@gmail.com');

-- Repairs Policies
CREATE POLICY "Public repair lookup by ID" ON repairs FOR SELECT USING (true);
CREATE POLICY "Users can see their linked repairs" ON repairs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins full access repairs" ON repairs USING ((auth.jwt() ->> 'email') = 'muczajanos7@gmail.com');

-- Machines for sale Policies
CREATE POLICY "Public machine view" ON machines_for_sale FOR SELECT USING (status = 'elérhető');
CREATE POLICY "Admins full access machines" ON machines_for_sale USING ((auth.jwt() ->> 'email') = 'muczajanos7@gmail.com');

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, is_admin)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone_number',
    (new.email = 'muczajanos7@gmail.com') -- Auto-set admin for this specific email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
