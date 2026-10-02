-- Migration V5: Increase default GPS accuracy tolerance for indoor clinic environments
ALTER TABLE branches ALTER COLUMN max_gps_accuracy_meters SET DEFAULT 150.00;
ALTER TABLE branches ALTER COLUMN allowed_radius_meters SET DEFAULT 150.00;

UPDATE branches 
SET 
    max_gps_accuracy_meters = GREATEST(max_gps_accuracy_meters, 150.00),
    allowed_radius_meters = GREATEST(allowed_radius_meters, 120.00)
WHERE max_gps_accuracy_meters < 150.00 OR allowed_radius_meters < 120.00;
