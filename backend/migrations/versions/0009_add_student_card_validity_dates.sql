BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS student_card_start_date DATE,
    ADD COLUMN IF NOT EXISTS student_card_end_date DATE;

COMMIT;
