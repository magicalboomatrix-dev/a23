-- 006: Moderator referral system updates
-- 1. Add status to referrals (pending until first deposit, then credited)
-- 2. Add credited_at to track when bonus was actually credited

ALTER TABLE referrals
  ADD COLUMN status ENUM('pending', 'credited') NOT NULL DEFAULT 'credited' AFTER bonus_amount,
  ADD COLUMN credited_at TIMESTAMP NULL DEFAULT NULL AFTER status;

-- Add index for efficient lookup of pending referrals
ALTER TABLE referrals ADD INDEX idx_referrals_referred_status (referred_user_id, status);
