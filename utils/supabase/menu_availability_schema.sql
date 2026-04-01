-- 1. Add Status Enum for Availability
DO $$ BEGIN
    CREATE TYPE availability_status AS ENUM ('available', 'out_of_stock', 'unavailable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Food Availability Table (to track per-location status)
CREATE TABLE IF NOT EXISTS public.food_availability (
    id BIGSERIAL PRIMARY KEY,
    food_id BIGINT REFERENCES public.foods(id) ON DELETE CASCADE,
    location TEXT NOT NULL, -- 'Eromo' or 'Chasemall'
    status availability_status DEFAULT 'available',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(food_id, location)
);

-- 3. Create Side Availability Table (if sides are also per-location)
CREATE TABLE IF NOT EXISTS public.side_availability (
    id BIGSERIAL PRIMARY KEY,
    side_id BIGINT REFERENCES public.sides(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    status availability_status DEFAULT 'available',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(side_id, location)
);

-- 4. Enable RLS
ALTER TABLE public.food_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_availability ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Everyone can read availability
CREATE POLICY "Allow public read on food_availability" ON public.food_availability
    FOR SELECT USING (true);

CREATE POLICY "Allow public read on side_availability" ON public.side_availability
    FOR SELECT USING (true);

-- Admins and Super Admins can update
CREATE POLICY "Allow admins to update food_availability" ON public.food_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (role = 'super_admin' OR role = 'admin')
        )
    );

CREATE POLICY "Allow admins to update side_availability" ON public.side_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (role = 'super_admin' OR role = 'admin')
        )
    );

-- 6. Helper to seed availability when new food/side is created (optional but good)
CREATE OR REPLACE FUNCTION public.initialize_food_availability()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.food_availability (food_id, location, status)
    VALUES (NEW.id, 'Eromo', 'available'), (NEW.id, 'Chasemall', 'available')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_init_food_availability
    AFTER INSERT ON public.foods
    FOR EACH ROW EXECUTE FUNCTION public.initialize_food_availability();

CREATE OR REPLACE FUNCTION public.initialize_side_availability()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.side_availability (side_id, location, status)
    VALUES (NEW.id, 'Eromo', 'available'), (NEW.id, 'Chasemall', 'available')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_init_side_availability
    AFTER INSERT ON public.sides
    FOR EACH ROW EXECUTE FUNCTION public.initialize_side_availability();
