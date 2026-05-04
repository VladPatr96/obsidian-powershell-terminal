/**
 * Packages the plugin for release.
 * Output: release/powershell-terminal.zip
 * Contents: main.js, manifest.json, styles.css, node_modules/node-pty (minimal)
 */
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RELEASE_DIR = join(ROOT, 'release', 'powershell-terminal')

// Clean and recreate
if (existsSync(join(ROOT, 'release'))) {
  rmSync(join(ROOT, 'release'), { recursive: true })
}
mkdirSync(RELEASE_DIR, { recursive: true })

// 1. Build first
console.log('Building...')
const build = spawnSync('node', ['esbuild.config.mjs', 'production'], {
  cwd: ROOT, encoding: 'utf8', stdio: 'inherit',
})
if (build.status !== 0) { console.error('Build failed'); process.exit(1) }

// 2. Copy plugin files
copyFileSync(join(ROOT, 'manifest.json'), join(RELEASE_DIR, 'manifest.json'))
copyFileSync(join(ROOT, 'styles.css'), join(RELEASE_DIR, 'styles.css'))

// main.js lives in the vault plugin dir after build — copy from node_modules source
// Actually copy from the vault-side build output indirectly:
// The vault plugin dir is only for dev. For release, read manifest.json to get the file.
// Re-export main.js from a neutral location.
const VAULT_PLUGIN_DIR = 'C:\\Users\\Патраваев\\projects\\Second_brain\\.obsidian\\plugins\\powershell-terminal'
copyFileSync(join(VAULT_PLUGIN_DIR, 'main.js'), join(RELEASE_DIR, 'main.js'))

// 3. Copy minimal node-pty files
const PTY_SRC = join(ROOT, 'node_modules', 'node-pty')
const PTY_DEST = join(RELEASE_DIR, 'node_modules', 'node-pty')

function copyDir(src, dest, filter = () => true) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    if (!filter(entry)) continue
    const s = join(src, entry)
    const d = join(dest, entry)
    if (statSync(s).isDirectory()) {
      copyDir(s, d, filter)
    } else {
      copyFileSync(s, d)
    }
  }
}

// package.json (needed for module resolution)
mkdirSync(PTY_DEST, { recursive: true })
copyFileSync(join(PTY_SRC, 'package.json'), join(PTY_DEST, 'package.json'))

// lib/ — skip test files and .map files, skip source maps for size
const SKIP_LIB = new Set(['.test.js', '.test.js.map', '.js.map'])
copyDir(join(PTY_SRC, 'lib'), join(PTY_DEST, 'lib'), (f) => {
  return !SKIP_LIB.has(f) && !f.endsWith('.test.js') && !f.endsWith('.js.map')
})

// Apply the Obsidian patch
copyFileSync(
  join(ROOT, 'patches', 'windowsConoutConnection.js'),
  join(PTY_DEST, 'lib', 'windowsConoutConnection.js')
)

// prebuilds/win32-x64 only (no macOS/Linux)
copyDir(
  join(PTY_SRC, 'prebuilds', 'win32-x64'),
  join(PTY_DEST, 'prebuilds', 'win32-x64'),
  (f) => !f.endsWith('.pdb')  // skip debug symbols
)

// 4. Create ZIP
console.log('Creating ZIP...')
const zip = spawnSync('powershell', [
  '-Command',
  `Compress-Archive -Path "${RELEASE_DIR}" -DestinationPath "${join(ROOT, 'release', 'powershell-terminal.zip')}" -Force`
], { encoding: 'utf8', stdio: 'inherit' })
if (zip.status !== 0) { console.error('ZIP failed'); process.exit(1) }

console.log('\nRelease ready: release/powershell-terminal.zip')
console.log('Contents:')
console.log('  main.js, manifest.json, styles.css')
console.log('  node_modules/node-pty/ (win32-x64 prebuilds)')
