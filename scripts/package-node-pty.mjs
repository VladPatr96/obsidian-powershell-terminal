/**
 * Packages node-pty binaries + Obsidian patch into node-pty-win32-x64.zip.
 * Structure inside the ZIP: node-pty/ (extracts into node_modules/node-pty/).
 *
 * This ZIP is uploaded as a release asset and downloaded by NodePtyInstaller
 * on first plugin activation (for community plugin store installs).
 */
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STAGE_DIR = join(ROOT, 'release', 'node-pty-stage', 'node-pty')

// ── Clean staging dir ─────────────────────────────────────────────────────────
if (existsSync(join(ROOT, 'release', 'node-pty-stage'))) {
  rmSync(join(ROOT, 'release', 'node-pty-stage'), { recursive: true })
}
mkdirSync(STAGE_DIR, { recursive: true })

// ── Copy node-pty (minimal subset) ───────────────────────────────────────────
const PTY_SRC = join(ROOT, 'node_modules', 'node-pty')

function copyDir(src, dest, skipFn = () => false) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    if (skipFn(entry)) continue
    const s = join(src, entry)
    const d = join(dest, entry)
    statSync(s).isDirectory() ? copyDir(s, d, skipFn) : copyFileSync(s, d)
  }
}

copyFileSync(join(PTY_SRC, 'package.json'), join(STAGE_DIR, 'package.json'))

// lib/ — skip tests and source maps
copyDir(join(PTY_SRC, 'lib'), join(STAGE_DIR, 'lib'),
  (f) => f.endsWith('.test.js') || f.endsWith('.js.map'))

// Apply Obsidian patch (direct pipe connection, no Worker threads)
copyFileSync(
  join(ROOT, 'patches', 'windowsConoutConnection.js'),
  join(STAGE_DIR, 'lib', 'windowsConoutConnection.js')
)

// prebuilds/win32-x64 only — skip debug symbols
copyDir(
  join(PTY_SRC, 'prebuilds', 'win32-x64'),
  join(STAGE_DIR, 'prebuilds', 'win32-x64'),
  (f) => f.endsWith('.pdb')
)

// ── Create ZIP ────────────────────────────────────────────────────────────────
const zipPath = join(ROOT, 'release', 'node-pty-win32-x64.zip')
const stageRoot = join(ROOT, 'release', 'node-pty-stage')

console.log('Creating node-pty-win32-x64.zip...')
const zip = spawnSync('powershell', [
  '-Command',
  `Compress-Archive -Path "${join(stageRoot, 'node-pty')}" -DestinationPath "${zipPath}" -Force`,
], { encoding: 'utf8', stdio: 'inherit' })
if (zip.status !== 0) { console.error('ZIP failed'); process.exit(1) }

const sizeMB = (statSync(zipPath).size / 1048576).toFixed(1)
console.log(`node-pty-win32-x64.zip ready (${sizeMB} MB)`)
console.log('  Contains: node-pty/ (lib + prebuilds/win32-x64 + Obsidian patch)')
