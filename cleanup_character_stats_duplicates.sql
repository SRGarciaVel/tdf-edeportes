BEGIN;

CREATE TEMP TABLE character_stats_merge_plan AS
SELECT
  cfn_id,
  UPPER(character_name) AS norm_name,
  (array_agg(id ORDER BY (master_rating IS NOT NULL) DESC, (matches_played IS NOT NULL) DESC))[1] AS keep_id,
  (array_agg(id ORDER BY (master_rating IS NOT NULL) DESC, (matches_played IS NOT NULL) DESC))[2:] AS delete_ids,
  MAX(matches_played) AS matches_played,
  MAX(win_rate) AS win_rate,
  MAX(master_rating) AS master_rating,
  MAX(tier) AS tier
FROM cfn_character_stats
GROUP BY cfn_id, UPPER(character_name)
HAVING COUNT(*) > 1;

UPDATE cfn_character_stats t
SET matches_played = COALESCE(t.matches_played, p.matches_played),
    win_rate = COALESCE(t.win_rate, p.win_rate),
    master_rating = COALESCE(t.master_rating, p.master_rating),
    tier = COALESCE(t.tier, p.tier),
    character_name = INITCAP(t.character_name)
FROM character_stats_merge_plan p
WHERE t.id = p.keep_id;

DELETE FROM cfn_character_stats
WHERE id IN (SELECT unnest(delete_ids) FROM character_stats_merge_plan);

UPDATE cfn_character_stats SET character_name = INITCAP(character_name) WHERE character_name <> INITCAP(character_name);

COMMIT;
