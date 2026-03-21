## ADDED Requirements

### Requirement: The system SHALL isolate AI execution behind a worker boundary
AI execution SHALL happen through a dedicated worker interface that returns structured action proposals instead of directly mutating platform state.

#### Scenario: AI worker returns a valid proposal
- **WHEN** the server sends an agent tick request and receives a valid action proposal
- **THEN** the server validates and applies the proposal through authoritative runtime rules

### Requirement: The system SHALL degrade safely on AI worker failure
The orchestration layer SHALL handle timeout, error, and invalid proposals without corrupting runtime state.

#### Scenario: AI worker times out
- **WHEN** the worker does not respond before the request deadline
- **THEN** the server records a diagnostic event and applies a safe fallback behavior
