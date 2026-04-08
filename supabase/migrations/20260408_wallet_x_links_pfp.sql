-- Add profile image URL to wallet_x_links for leaderboard PFPs
ALTER TABLE wallet_x_links ADD COLUMN IF NOT EXISTS profile_image_url text;
