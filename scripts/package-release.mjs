/**
 * Packages the plugin for release.
 * Output: release/powershell-terminal.zip
 *
 * Works both locally (reads main.js from vault plugin dir)
 * and in CI (reads main.js from dist/ after CI_BUILD=true build).
 */
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RELEASE_DIR = join(ROOT, 'release', 'powershell-terminal')
const IS_CI = process.env.CI_BUILD === 'true'

// main.js comes from dist/ in CI, from vault in local builds
const BUILD_OUT_DIR = IS_CI
  ? join(ROOT, 'dist')
  : 'C:\\Users\\Патраваев\\projects\\Second_brain\\.obsidian\\plugins\\powershell-terminal'

// ── Clean output ──────────────────────────────────────────────────────────────
if (existsSync(join(ROOT, 'release'))) rmSync(join(ROOT, 'release'), { recursive: true })
mkdirSync(RELEASE_DIR, { recursive: true })

// ── Build ─────────────────────────────────────────────────────────────────────
console.log('Building...')
const build = spawnSync('node', ['esbuild.config.mjs', 'production'], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: 'inherit',
  env: { ...process.env },
})
if (build.status !== 0) { console.error('Build failed'); process.exit(1) }

// ── Copy plugin files ─────────────────────────────────────────────────────────
copyFileSync(join(BUILD_OUT_DIR, 'main.js'), join(RELEASE_DIR, 'main.js'))
copyFileSync(join(ROOT, 'manifest.json'), join(RELEASE_DIR, 'manifest.json'))
copyFileSync(join(ROOT, 'styles.css'), join(RELEASE_DIR, 'styles.css'))

// ── Copy node-pty (minimal subset) ───────────────────────────────────────────
const PTY_SRC = join(ROOT, 'node_modules', 'node-pty')
const PTY_DEST = join(RELEASE_DIR, 'node_modules', 'node-pty')

function copyDir(src, dest, skipFn = () => false) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    if (skipFn(entry)) continue
    const s = join(src, entry)
    const d = join(dest, entry)
    statSync(s).isDirectory() ? copyDir(s, d, skipFn) : copyFileSync(s, d)
  }
}

mkdirSync(PTY_DEST, { recursive: true })
copyFileSync(join(PTY_SRC, 'package.json'), join(PTY_DEST, 'package.json'))

// lib/ — skip tests and source maps
copyDir(join(PTY_SRC, 'lib'), join(PTY_DEST, 'lib'),
  (f) => f.endsWith('.test.js') || f.endsWith('.js.map'))

// Apply Obsidian patch (direct pipe connection, no Worker threads)
copyFileSync(
  join(ROOT, 'patches', 'windowsConoutConnection.js'),
  join(PTY_DEST, 'lib', 'windowsConoutConnection.js')
)

// prebuilds/win32-x64 only — skip debug symbols and other platforms
copyDir(
  join(PTY_SRC, 'prebuilds', 'win32-x64'),
  join(PTY_DEST, 'prebuilds', 'win32-x64'),
  (f) => f.endsWith('.pdb')
)

// ── Create plugin ZIP ─────────────────────────────────────────────────────────
console.log('Creating powershell-terminal.zip...')
const zipPath = join(ROOT, 'release', 'powershell-terminal.zip')
const zip = spawnSync('powershell', [
  '-Command',
  `Compress-Archive -Path "${RELEASE_DIR}" -DestinationPath "${zipPath}" -Force`,
], { encoding: 'utf8', stdio: 'inherit' })
if (zip.status !== 0) { console.error('ZIP failed'); process.exit(1) }

// ── Create node-pty binaries ZIP ─────────────────────────────────────────────
console.log('Creating node-pty-win32-x64.zip...')
const nodePtyResult = spawnSync('node', ['scripts/package-node-pty.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: 'inherit',
})
if (nodePtyResult.status !== 0) { console.error('node-pty ZIP failed'); process.exit(1) }

const sizeMB = (statSync(zipPath).size / 1048576).toFixed(1)
const nodePtyZipPath = join(ROOT, 'release', 'node-pty-win32-x64.zip')
const nodePtySizeMB = (statSync(nodePtyZipPath).size / 1048576).toFixed(1)
console.log(`\nRelease ready:`)
console.log(`  release/powershell-terminal.zip   (${sizeMB} MB) — full plugin for manual install`)
console.log(`  release/node-pty-win32-x64.zip    (${nodePtySizeMB} MB) — binaries for auto-download`)
console.log('  main.js  manifest.json  styles.css')
console.log('  node_modules/node-pty/ (win32-x64 prebuilds + Obsidian patch)')
