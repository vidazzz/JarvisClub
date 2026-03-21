## ADDED Requirements

### Requirement: The system SHALL provide a stable real-time session protocol
The system SHALL provide a WebSocket-based protocol for session establishment, world snapshots, room snapshots, state deltas, and agent status updates.

#### Scenario: Client connects for the first time
- **WHEN** a client establishes a new real-time session
- **THEN** the server returns session identity and an initial world snapshot

### Requirement: The system SHALL support session resumption
The system SHALL allow a disconnected client to resume its prior session and recover world or room context.

#### Scenario: Client reconnects after a transient disconnect
- **WHEN** a client reconnects with a valid resume token
- **THEN** the server restores the session and resynchronizes the client state
