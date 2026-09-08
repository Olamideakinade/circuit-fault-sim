# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

## [1.2.0] - 2024-05-15
### Added
- Complete visual overhaul featuring modern dark theme, glow animations, and polished UI controls.
- Advanced fault injection capabilities (stuck-at-0 and stuck-at-1).
- Full component wire routing, drag-and-drop support, and state inspection.
- Comprehensive file import/export via JSON schema with visual error handling.

### Changed
- Refactored `SimulatorEngine` for robust signal propagation and fault testing.
- Upgraded `app.js` with complete event listeners, rendering loops, and UI bindings.
- Enhanced `style.css` for high responsiveness and sleek developer-focused aesthetics.

### Fixed
- High-DPI canvas scaling and coordinate offset rendering bugs.
- Memory leaks during repeated simulation resets.

## [1.1.0] - 2023-10-27
### Added
- JSON export/import functionality.
- Keyboard event listeners for rapid prototyping.
- `SimulatorEngine.validate()` for schema checking.

### Changed
- Refactored `app.js` to utilize a centralized event bus.
- Updated `style.css` for better responsiveness.

### Fixed
- Resolved coordinate offset issues on high-DPI displays.

## [1.0.0] - 2023-01-15
### Added
- Initial release of the Circuit Fault Simulation Engine.
- Basic canvas rendering and simulation loop.
