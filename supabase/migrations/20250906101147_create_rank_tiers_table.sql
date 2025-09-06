-- Create rank_tiers table for gamification system
CREATE TABLE IF NOT EXISTS public.rank_tiers (
    id BIGSERIAL PRIMARY KEY,
    level INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    points_required INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rank tiers (33 levels as expected by the application)
INSERT INTO public.rank_tiers (level, name, points_required, color, description) VALUES
(1, 'Beginner', 0, '#10B981', 'Starting your productivity journey'),
(2, 'Apprentice', 100, '#10B981', 'Learning the basics'),
(3, 'Novice', 250, '#10B981', 'Building momentum'),
(4, 'Student', 500, '#10B981', 'Developing skills'),
(5, 'Practitioner', 750, '#3B82F6', 'Gaining experience'),
(6, 'Skilled', 1000, '#3B82F6', 'Showing competence'),
(7, 'Competent', 1500, '#3B82F6', 'Demonstrating ability'),
(8, 'Proficient', 2000, '#3B82F6', 'Building expertise'),
(9, 'Advanced', 2750, '#3B82F6', 'High level skills'),
(10, 'Expert', 3500, '#8B5CF6', 'Mastering the craft'),
(11, 'Specialist', 4500, '#8B5CF6', 'Deep knowledge'),
(12, 'Professional', 5500, '#8B5CF6', 'Industry standard'),
(13, 'Senior', 7000, '#8B5CF6', 'Seasoned professional'),
(14, 'Lead', 8500, '#8B5CF6', 'Leading others'),
(15, 'Principal', 10500, '#F59E0B', 'Principal level'),
(16, 'Senior Principal', 12500, '#F59E0B', 'Senior principal'),
(17, 'Distinguished', 15000, '#F59E0B', 'Distinguished contributor'),
(18, 'Senior Distinguished', 18000, '#F59E0B', 'Senior distinguished'),
(19, 'Fellow', 21500, '#F59E0B', 'Technical fellow'),
(20, 'Senior Fellow', 25500, '#EF4444', 'Senior technical fellow'),
(21, 'Master', 30000, '#EF4444', 'Master of the craft'),
(22, 'Grandmaster', 35000, '#EF4444', 'Grandmaster level'),
(23, 'Elite', 40500, '#EF4444', 'Elite performer'),
(24, 'Champion', 46500, '#EF4444', 'Champion level'),
(25, 'Legend', 53000, '#DC2626', 'Legendary status'),
(26, 'Mythic', 60000, '#DC2626', 'Mythic achievement'),
(27, 'Titan', 68000, '#DC2626', 'Titan level'),
(28, 'Immortal', 77000, '#DC2626', 'Immortal status'),
(29, 'Transcendent', 87000, '#991B1B', 'Beyond mortal limits'),
(30, 'Ascended', 98000, '#991B1B', 'Ascended being'),
(31, 'Divine', 110000, '#991B1B', 'Divine level'),
(32, 'Omnipotent', 125000, '#7F1D1D', 'Omnipotent force'),
(33, 'Ultimate', 150000, '#7F1D1D', 'Ultimate achievement');

-- Enable RLS
ALTER TABLE public.rank_tiers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read rank tiers
CREATE POLICY "Allow public read access to rank_tiers" ON public.rank_tiers
    FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rank_tiers_level ON public.rank_tiers(level);
CREATE INDEX IF NOT EXISTS idx_rank_tiers_points_required ON public.rank_tiers(points_required);

-- Add comment
COMMENT ON TABLE public.rank_tiers IS 'Defines the rank tiers for the gamification system with points requirements';
