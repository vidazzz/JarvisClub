## ADDED Requirements

### Requirement: The system SHALL maintain authoritative world and room state
The server SHALL be the only authority for shared hall state, room instance state, activity outcomes, and entity state transitions.

#### Scenario: A player and an AI both affect the same activity
- **WHEN** concurrent commands or proposals target the same world or room object
- **THEN** the server resolves the outcome and emits the authoritative result to all clients

### Requirement: The system SHALL support a mixed world model
The runtime SHALL support a persistent shared hall and isolated room instances, with explicit transitions between them.

#### Scenario: An agent enters and leaves a room
- **WHEN** an agent joins a room from the shared hall and later completes the room activity
- **THEN** the room result is persisted and reflected back into the shared world event stream
