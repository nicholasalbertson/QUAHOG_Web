# Flake policy (§15.3.5)

- Quarantine flaky tests with `it.skip` + issue link within 1 business day of detection.
- Fix or delete within 2 days; do not leave quarantines to rot.
- Prefer seed-locked sim tests over wall-clock timing.
- Device soaks are not flakes — mark DEVICE-BLOCKED instead.
