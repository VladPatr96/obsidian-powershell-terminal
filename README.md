# PowerShell Terminal for Obsidian

Embedded PowerShell terminal inside Obsidian. Runs on Windows via ConPTY — full keyboard support including arrows, Tab completion, PSReadLine, and Ctrl shortcuts.

## Features

- Real PTY via Windows ConPTY (no projection bugs, no external window)
- Full keyboard support — arrows, Backspace, Tab, Ctrl+C, PSReadLine
- Multiple shell profiles (PowerShell, pwsh, cmd, WSL)
- Per-profile settings: startup commands, env vars, font, theme
- Auto theme following Obsidian (dark/light/auto)
- Drag-and-drop panel positioning
- `{{vault}}` template variable in startup commands and start directory

## Requirements

- Windows 10 (build 18309+) or Windows 11
- Obsidian 1.4.0+

## Installation

### Manual

1. Download `powershell-terminal.zip` from [Releases](https://github.com/VladPatr96/obsidian-powershell-terminal/releases/latest)
2. Extract — you get a `powershell-terminal/` folder
3. Copy it to your vault's `.obsidian/plugins/` directory
4. In Obsidian → Settings → Community Plugins → enable **PowerShell Terminal**

### BRAT (not supported)

BRAT is not supported because the plugin ships native binaries (`node-pty`) that must be placed alongside `main.js`.

## Usage

- Click the terminal icon in the ribbon (left sidebar)
- Or `Ctrl+P` → **Open Terminal**
- Or click **⬛ Terminal** in the status bar

## Configuration

Settings → Plugin Options → **PowerShell Terminal**

| Setting | Description |
|---------|-------------|
| Shell | Path to executable (`powershell.exe`, `pwsh.exe`, `cmd.exe`) |
| Args | Launch arguments (default: `-NoLogo -NoExit`) |
| Start directory | Vault root / Home / Custom path |
| Startup commands | Commands sent on launch, one per line. Use `{{vault}}` for vault path |
| Env vars | `KEY=VALUE` pairs, one per line |
| Font size / family | Terminal font settings |
| Theme | Dark / Light / Auto (follows Obsidian) |

## Known Limitations

- Windows only (`isDesktopOnly: true`)
- No PTY programs inside the terminal (`vim`, `ssh -t`, `python -i`)
- WSL support requires `wsl.exe` as the shell path

## Development

```powershell
git clone https://github.com/VladPatr96/obsidian-powershell-terminal
cd obsidian-powershell-terminal
npm install
# Set VAULT_PLUGIN_DIR in esbuild.config.mjs to your vault path
npm run dev      # watch mode → auto-copies to vault
npm run build    # single build
npm run release  # packages release/powershell-terminal.zip
```

## Architecture

```
xterm.js (renderer) ←→ ShellProcess ←→ node-pty (ConPTY) ←→ PowerShell
```

node-pty is shipped as prebuilt binaries inside the plugin package — no compilation needed.

The `patches/windowsConoutConnection.js` overrides node-pty's Worker-thread-based output relay with a direct named pipe connection, because Obsidian's Electron renderer disables Worker threads.

## License

MIT
