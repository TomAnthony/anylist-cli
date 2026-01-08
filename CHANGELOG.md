# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-08

### Added

- Initial public release
- Core CLI commands:
  - `auth` - Interactive authentication
  - `logout` - Clear stored credentials
  - `whoami` - Show current authenticated user
  - `lists` - Show all lists
  - `items` - Show items in a list
  - `add` - Add item to a list (with category and quantity support)
  - `check` - Mark item as checked
  - `uncheck` - Mark item as unchecked
  - `remove` - Remove item from a list
  - `clear` - Remove all checked items
  - `categories` - List available item categories
- JSON output support (`--json` flag)
- Color output with `--no-color` flag and `NO_COLOR` env var support
- Environment variable authentication (`ANYLIST_EMAIL`, `ANYLIST_PASSWORD`)
- Case-insensitive list and item matching

### Notes

This is the first public release. The CLI wraps the unofficial `anylist` npm package.
