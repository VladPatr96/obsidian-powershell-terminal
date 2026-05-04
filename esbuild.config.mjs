import esbuild from 'esbuild'
import { existsSync, mkdirSync } from 'fs'

const VAULT_PLUGIN_DIR = 'C:\\Users\\Патраваев\\projects\\Second_brain\\.obsidian\\plugins\\powershell-terminal'

if (!existsSync(VAULT_PLUGIN_DIR)) mkdirSync(VAULT_PLUGIN_DIR, { recursive: true })

const prod = process.argv[2] === 'production'

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: `${VAULT_PLUGIN_DIR}/main.js`,
})

if (prod) {
  await ctx.rebuild()
  process.exit(0)
} else {
  await ctx.watch()
}
