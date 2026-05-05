import { Notice, requestUrl } from 'obsidian'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'

const BINARIES_URL =
  'https://github.com/VladPatr96/obsidian-powershell-terminal/releases/latest/download/node-pty-win32-x64.zip'

export function isNodePtyInstalled(pluginDir: string): boolean {
  return existsSync(join(pluginDir, 'node_modules', 'node-pty', 'lib', 'index.js'))
}

export async function installNodePty(pluginDir: string): Promise<void> {
  const notice = new Notice('PowerShell terminal: downloading terminal engine (first-time setup)…', 0)

  const zipPath = join(pluginDir, 'node-pty-tmp.zip')

  try {
    // ── Download ──────────────────────────────────────────────────────────
    const response = await requestUrl({ url: BINARIES_URL, method: 'GET' })
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
    writeFileSync(zipPath, Buffer.from(response.arrayBuffer))

    // ── Extract ───────────────────────────────────────────────────────────
    notice.setMessage('PowerShell Terminal: extracting…')
    const nodeModulesDir = join(pluginDir, 'node_modules')
    mkdirSync(nodeModulesDir, { recursive: true })

    const result = spawnSync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command',
       `Expand-Archive -Path "${zipPath}" -DestinationPath "${nodeModulesDir}" -Force`],
      { encoding: 'utf8', windowsHide: true, timeout: 30_000 }
    )
    if (result.status !== 0) throw new Error(result.stderr || 'Extraction failed')

    notice.setMessage('PowerShell Terminal: ready! Open the terminal from the ribbon.')
    setTimeout(() => notice.hide(), 4000)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    new Notice(
      `PowerShell Terminal: setup failed — ${msg}\n\nDownload manually:\n${BINARIES_URL}`,
      10_000
    )
  } finally {
    if (existsSync(zipPath)) try { unlinkSync(zipPath) } catch { /* ignore cleanup failure */ }
  }
}
