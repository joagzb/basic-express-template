# Known limitations

This repository is a development template, not a production-ready service.

## Runtime limitations

- Memory persistence is process-local and non-durable. It is not shared across app instances or restarts, and restarting the process loses users and auth sessions.
- Redis can be configured and connected, but no current feature consumes it. User endpoints are not cached, and auth sessions use the selected memory or PostgreSQL provider.
