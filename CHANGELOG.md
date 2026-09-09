# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

## [1.4.0] - 2024-06-15
### Added
- Keyboard shortcut bindings for simulation play/pause, component deletion, and undo/redo workflows.
- Circuit export and import capabilities via JSON file interchange.
- Fault propagation analysis logs and diagnostic telemetry drawer.
### Changed
- Enhanced canvas rendering loop with optimized dirty-rect tracking and smooth anti-aliased wire rendering.
- Upgraded error handling and boundary limits within the simulation tick cycle.

## [1.3.0] - 2024-06-01
### Added
- Complete visual overhaul featuring glassmorphism panels, neon glow states, and fluid interface animations.
- Advanced orthogonal wire routing with collision-aware snapping and real-time signal telemetry.
- Live telemetry diagnostics overlay tracking active FPS, component tick counts, and propagation delays.
- Local storage auto-persistence with snapshot history.