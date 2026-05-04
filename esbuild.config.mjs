import esbuild from 'esbuild'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// In CI there is no local vault — output to dist/ instead
const IS_CI = process.env.CI_BUILD === 'true'
const VAULT_PLUGIN_DIR = IS_CI
  ? join(__dirname, 'dist')
  : 'C:\\Users\\Патраваев\\projects\\Second_brain\\.obsidian\\plugins\\powershell-terminal'

if (!existsSync(VAULT_PLUGIN_DIR)) mkdirSync(VAULT_PLUGIN_DIR, { recursive: true })

const prod = process.argv[2] === 'production'

function copyNodePtyToPlugin() {
  if (IS_CI) return // package-release.mjs handles this in CI
  const src = join(__dirname, 'node_modules', 'node-pty')
  const dest = join(VAULT_PLUGIN_DIR, 'node_modules', 'node-pty')
  const result = spawnSync('robocopy', [src, dest, '/E', '/XF', '*.pdb', '/NFL', '/NDL', '/NJH', '/NJS'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  // robocopy: 0 = no files, 1 = copied OK, 8+ = error
  if (result.status !== null && result.status >= 8) {
    throw new Error(`robocopy failed with exit code ${result.status}`)
  }
  // Apply patch: override node-pty's windowsConoutConnection.js so it works
  // without Worker threads (disabled in Obsidian's Electron renderer)
  copyFileSync(
    join(__dirname, 'patches', 'windowsConoutConnection.js'),
    join(VAULT_PLUGIN_DIR, 'node_modules', 'node-pty', 'lib', 'windowsConoutConnection.js')
  )
}

const copyPlugin = {
  name: 'copy-node-pty',
  setup(build) {
    build.onEnd(() => copyNodePtyToPlugin())
  },
}

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*', 'node-pty'],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: join(VAULT_PLUGIN_DIR, 'main.js'),
  plugins: [copyPlugin],
})

if (prod) {
  await ctx.rebuild()
  process.exit(0)
} else {
  await ctx.watch()
}
