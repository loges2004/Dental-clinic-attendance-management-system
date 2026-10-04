-- V9: Allow branch_id to be NULL for Admin and Multi-Branch Staff
ALTER TABLE employees ALTER COLUMN branch_id DROP NOT NULL;
