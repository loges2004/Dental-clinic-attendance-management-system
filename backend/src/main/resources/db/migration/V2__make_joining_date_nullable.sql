-- Make joining_date optional (nullable) for employees
ALTER TABLE employees ALTER COLUMN joining_date DROP NOT NULL;
