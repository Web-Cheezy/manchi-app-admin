UPDATE profiles
SET location = 'Eromo'
WHERE location = 'Aurora';

UPDATE orders
SET location = 'Eromo'
WHERE location = 'Aurora';

UPDATE food_availability
SET location = 'Eromo'
WHERE location = 'Aurora';

UPDATE side_availability
SET location = 'Eromo'
WHERE location = 'Aurora';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_location_check;
ALTER TABLE profiles
ADD CONSTRAINT profiles_location_check
CHECK (location IN ('Chasemall', 'Eromo', 'All'));
