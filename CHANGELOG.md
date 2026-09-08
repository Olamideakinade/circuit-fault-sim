# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

## [1.3.0] - 2024-06-01
### Added
- Complete visual overhaul featuring glassmorphism panels, neon glow states, and fluid interface animations.
- Advanced orthogonal wire routing with collision-aware snapping and real-time signal telemetry.
- Live telemetry diagnostics overlay tracking active FPS, component tick counts, and propagation delays.
- Local storage auto-persistence with snapshot restore and schema validation checks.

### Changed
- Upgraded `SimulatorEngine` to support complex sequential gate arrays and synchronous flip-flop states.
- Refactored canvas render pipeline for high-DPI crispness and reduced garbage collection overhead.

### Fixed
- Resolved edge case where cyclic feedback loops caused propagation deadlocks.
- Fixed pin offset calculation errors during component drag operations.

## [1.2.0] - 2024-05-15
### Added
- Complete visual overhaul featuring modern dark theme, glow animations, and polished UI controls.
- Advanced fault injection capabilities (stuck-at-0 and stuck-at-1).
- Full component wire routing, drag-and-drop support, and state inspection.
- Comprehensive file import/export via JSON schema with visual error handling.