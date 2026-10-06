-- Stacker scores how quickly each row was stopped as well, counted in bounces: every time the row
-- turned around at a wall before it was stopped. The run's total is kept for breaking ties, fewer
-- first. Scores from before this have no bounces and live on under the old game id, "stacker".
ALTER TABLE scores ADD COLUMN bounces INTEGER NOT NULL DEFAULT 0;
CREATE INDEX scores_board_bounces ON scores (game, score DESC, bounces ASC, created_at ASC);
