-- Security: run free-agency public view as the caller (advisor / least privilege).
-- Already applied on production poke-mnky (chmrszrwlfeqovwxyrmt) 2026-11-14;
-- this file mirrors the prod ledger version/name for Deploy-to-production.
--
-- Note: with security_invoker=true the caller must have SELECT on underlying
-- relations (transaction_audit, teams) that pass RLS. If transaction_audit is
-- tightened later, prefer column grants on the public projection columns rather
-- than reverting this view to security definer.

alter view public.v_public_free_agency set (security_invoker = true);
