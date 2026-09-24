# CarePlus migration reconciliation

The production database contains migrations that are not currently represented in the repository. Exact historical SQL should only be restored when it can be verified from repository history or another authoritative source.

The live Supabase migration history is recorded separately in the project. Existing production migrations must not be rerun merely to repair repository history.

## Verified repository history

The feedback-completion migration in the repository was created by commit `0549eea7fc31bda8ad08fd4ef7c9d183eddb54a2`, and its SQL is recoverable from Git history. The repository filename is `20260919213156_create_feedback_request_on_completion.sql`.

## Current discrepancy to resolve

The live project records `20260919213151_create_feedback_request_on_appointment_completion`, while the repository contains the equivalent feedback migration under the `...213156...` filename. The SQL was recovered from Git history, so this is a migration-version/name discrepancy rather than an unknown SQL body.

The live project also records `20260923231920_secure_notification_dispatch_functions`, which is not currently present in the repository. Its historical SQL has not yet been recovered from Git history and must not be invented.

The live project records `20260924161308_harden_notification_dispatch_batch_execute_permissions`, while the repository contains the verified permission migration as `20260924173000_harden_notification_dispatch_batch_execute_permissions.sql`. The SQL in the repository was introduced by commit `f68fe875f2841675fe37ee4f5ea95c5929aa14cb`; the differing timestamp/version should be reconciled without replaying production migrations.
