-- The spine could not write its own outbox.
--
-- 20260830000000_act_intake.sql revoked anon and authenticated from both tables,
-- which was right, but never granted service_role anything. Verified against
-- information_schema.role_table_grants on 2026-08-30: act_intake and
-- act_duty_of_care_register carry grants for postgres and agent_readonly only,
-- while every neighbouring table (community_submissions and the rest) carries
-- INSERT, SELECT, UPDATE for service_role.
--
-- Grants are not RLS. service_role bypasses row level security, but a role with no
-- table privilege is refused before any policy is consulted. The intake edge
-- function builds its client with SUPABASE_SERVICE_ROLE_KEY and goes through
-- PostgREST, so the first real submission would have been refused at the insert and
-- the visitor would have seen 500 "Could not record submission".
--
-- That is worse than it sounds, because the outbox row written before any network
-- call is the thing every other guarantee in this design rests on: the retry job,
-- the duty-of-care register, and the sweeper that re-alerts on a failed send all
-- assume the row exists. None of them could have run.
--
-- No DELETE, deliberately. Rows in both tables are kept and never deleted, so the
-- gate stays reviewable and a duty-of-care record cannot be quietly removed. The
-- retention rule decided on #90 nulls the payload with an UPDATE; it does not
-- delete the row.

grant select, insert, update on table public.act_intake to service_role;
grant select, insert, update on table public.act_duty_of_care_register to service_role;
