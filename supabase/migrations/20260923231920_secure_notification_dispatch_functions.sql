-- Reconstructed from the verified production privilege state.
-- The original historical migration body was not recoverable from Git history.
-- This migration restores the security boundary required for the dispatcher
-- functions created immediately before it: only service_role may execute them.

REVOKE ALL ON FUNCTION public.claim_notification_dispatch(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_notification_dispatch(bigint, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_notification_dispatch(bigint, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_dispatch(bigint, text) TO service_role;

REVOKE ALL ON FUNCTION public.claim_notification_dispatch_batch(text, text[], integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_notification_dispatch_batch(text, text[], integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_notification_dispatch_batch(text, text[], integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_dispatch_batch(text, text[], integer) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_notification_dispatch(bigint, text, public.notification_status, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_notification_dispatch(bigint, text, public.notification_status, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_notification_dispatch(bigint, text, public.notification_status, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_notification_dispatch(bigint, text, public.notification_status, text, text) TO service_role;
