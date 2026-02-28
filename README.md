# anylist-cli

> **⚠️ Unofficial CLI for AnyList**  
> Not affiliated with or endorsed by AnyList.

A command-line interface for managing your [AnyList](https://www.anylist.com) grocery and shopping lists.

## Installation

```bash
npm install -g anylist-cli
```

Or run directly with npx:

```bash
npx anylist-cli --help
```

## Quick Start

```bash
# Authenticate (interactive)
anylist auth

# View your lists
anylist lists

# View items on a list
anylist items "Grocery"

# Add an item
anylist add "Grocery" "Milk" --category dairy

# Add an item with notes
anylist add "Grocery" "Chicken" --notes "Free range" --category meat

# Check off an item
anylist check "Grocery" "Milk"
```

## Commands

### Authentication

```bash
# Interactive login (credentials stored securely)
anylist auth

# Clear stored credentials
anylist logout

# Show current user
anylist whoami
```

### Lists

```bash
# Show all lists
anylist lists
anylist lists --json
```

### Items

```bash
# Show items in a list
anylist items "Grocery"
anylist items "Grocery" --json
anylist items "Grocery" --unchecked   # Only unchecked items

# Add item to a list
anylist add "Grocery" "Milk"
anylist add "Grocery" "Milk" --quantity "2"
anylist add "Grocery" "Chicken" --category meat
anylist add "Grocery" "Milk" --notes "Get 2%"

# Get or set notes on an item
anylist note "Grocery" "Milk"                       # View notes
anylist note "Grocery" "Milk" "Get the organic kind" # Set notes
anylist note "Grocery" "Milk" ""                     # Clear notes

# Check/uncheck items
anylist check "Grocery" "Milk"
anylist uncheck "Grocery" "Milk"

# Remove item
anylist remove "Grocery" "Milk"

# Clear all checked items
anylist clear "Grocery"
```

### Categories

```bash
# List available categories
anylist categories
```

**Available categories:** produce, meat, seafood, dairy, bakery, bread, frozen, canned, condiments, beverages, snacks, pasta, rice, cereal, breakfast, baking, spices, seasonings, household, personal care, other

## Options

Global flags available on all commands:

| Flag | Description |
|------|-------------|
| `-h, --help` | Show help |
| `-V, --version` | Show version number |
| `--no-color` | Disable colored output |
| `--json` | Output as JSON (where applicable) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANYLIST_EMAIL` | Email for authentication (for CI/automation) |
| `ANYLIST_PASSWORD` | Password for authentication (for CI/automation) |
| `NO_COLOR` | Disable colored output (any value) |

For non-interactive use (CI/CD pipelines, scripts), set both `ANYLIST_EMAIL` and `ANYLIST_PASSWORD` environment variables instead of using `anylist auth`.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Generic failure |
| `2` | Invalid usage (bad arguments) |
| `3` | Authentication failure |

## Examples

### Scripting with JSON output

```bash
# Get items as JSON for processing
anylist items "Grocery" --json | jq '.items[] | select(.checked == false) | .name'

# Check if authenticated
if anylist whoami --json | jq -e '.authenticated' > /dev/null; then
  echo "Logged in"
fi
```

### Adding multiple items

```bash
# Add ingredients from a recipe
anylist add "Grocery" "Ground beef" --category meat --notes "85% lean"
anylist add "Grocery" "Onions" --category produce
anylist add "Grocery" "Tomatoes" --category produce --notes "Roma, 6 count"
anylist add "Grocery" "Pasta" --category pasta
```

### Non-Interactive Usage

For scripts and automation, set credentials via environment variables instead of using interactive `anylist auth`:

```bash
# Commands will use these automatically
ANYLIST_EMAIL="..." ANYLIST_PASSWORD="..." anylist lists --json
```

In CI/CD pipelines, store credentials as secrets and inject them as environment variables.

## Development

```bash
# Clone the repository
git clone https://github.com/mjrussell/anylist-cli
cd anylist-cli

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/cli.js --help
```

## How It Works

This CLI wraps the unofficial [`anylist`](https://www.npmjs.com/package/anylist) npm package, which reverse-engineers AnyList's private API. As such:

- This is **not an official tool** and may break if AnyList changes their API
- Use at your own risk
- Do not use for mission-critical applications

## Contributing

Contributions welcome! Please open an issue or pull request on [GitHub](https://github.com/mjrussell/anylist-cli).

## License

MIT © [Matt Russell](https://github.com/mjrussell)

## Disclaimer

This is an unofficial tool created by the community. AnyList is a trademark of Purple Cover, Inc. This project is not affiliated with, endorsed by, or connected to AnyList or Purple Cover, Inc. in any way.
