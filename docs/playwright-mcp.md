Playwright MCP Server

This project includes the Playwright MCP server as a local dev dependency and an npm script to run it.

How to start
- Ensure dependencies are installed: `npm install`
- Start the server: `npm run mcp:playwright`

Defaults
- Host: `127.0.0.1`
- Port: `8899`
- Output dir: `.playwright-mcp` (screenshots, traces, sessions)
- Mode: `--isolated` (ephemeral profile; provide `--save-session`/`--storage-state` as needed)

Optional flags
- `--headless` to run without a visible browser window
- `--device "iPhone 15"` to emulate a device
- `--caps vision,pdf` to enable extra capabilities
- `--save-trace` to record a Playwright trace in the output dir

Browser binaries
- If Playwright has not downloaded browsers yet, run: `npx playwright install chromium`
- You can also install all: `npx playwright install`

Integrating with your MCP client
- Command: `mcp-server-playwright --host 127.0.0.1 --port 8899 --output-dir .playwright-mcp`
- Transport: SSE on `http://127.0.0.1:8899`
- Tool namespace typically appears as `playwright` (e.g., `browser_navigate`, `browser_click`, etc.)

Troubleshooting
- Port in use: change the `--port` to a free one (e.g., 8900)
- Permissions on macOS: allow screen recording/automation if prompted
- SSL errors: use `--ignore-https-errors` for dev only

