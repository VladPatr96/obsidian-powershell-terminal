import { ItemView, WorkspaceLeaf } from 'obsidian'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { ShellProcess } from './ShellProcess'
import { Profile } from './types'
import type PowerShellTerminalPlugin from './main'

export const VIEW_TYPE = 'powershell-terminal-view'

export class TerminalView extends ItemView {
  private terminal: Terminal | null = null
  private fitAddon: FitAddon | null = null
  private shellProcess: ShellProcess | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor(leaf: WorkspaceLeaf, private plugin: PowerShellTerminalPlugin) {
    super(leaf)
  }

  getViewType(): string { return VIEW_TYPE }
  getDisplayText(): string { return 'Terminal' }
  getIcon(): string { return 'terminal' }

  async onOpen(): Promise<void> {
    const content = this.containerEl.children[1] as HTMLElement
    content.empty()
    content.style.cssText = 'padding:0;overflow:hidden;height:100%;'
    const profile = this.plugin.profileManager.getDefault()
    const termEl = content.createDiv({ cls: 'pst-terminal' })
    this.initTerminal(termEl, profile)
    this.connectProcess(profile)
  }

  private getTerminalTheme(profile: Profile): object {
    const mode = profile.theme === 'auto'
      ? (document.body.classList.contains('theme-dark') ? 'dark' : 'light')
      : profile.theme
    return mode === 'dark'
      ? { background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#d4d4d4',
          selectionBackground: '#264f78' }
      : { background: '#ffffff', foreground: '#1e1e1e', cursor: '#1e1e1e',
          selectionBackground: '#add6ff' }
  }

  private initTerminal(el: HTMLElement, profile: Profile): void {
    this.fitAddon = new FitAddon()
    this.terminal = new Terminal({
      fontSize: profile.fontSize,
      fontFamily: profile.fontFamily,
      theme: this.getTerminalTheme(profile),
      scrollback: this.plugin.settings.scrollbackLines,
      cursorBlink: true,
      allowTransparency: false,
    })
    this.terminal.loadAddon(this.fitAddon)
    this.terminal.loadAddon(new WebLinksAddon())
    this.terminal.open(el)
    this.fitAddon.fit()
    this.resizeObserver = new ResizeObserver(() => {
      try {
        this.fitAddon?.fit()
      } catch {}
    })
    this.resizeObserver.observe(el)
    this.terminal.onData((data) => this.shellProcess?.write(data))
    this.terminal.onResize(({ cols, rows }) => this.shellProcess?.resize(cols, rows))
  }

  private connectProcess(profile: Profile): void {
    const vaultPath = (this.app.vault.adapter as any).basePath as string ?? ''
    const cwd =
      profile.startDir === 'vault' ? vaultPath
      : profile.startDir === 'home' ? require('os').homedir()
      : profile.customStartDir || vaultPath
    const resolvedCommands = profile.startupCommands.map((cmd) =>
      cmd.replace(/\{\{vault\}\}/g, vaultPath)
    )
    this.shellProcess = new ShellProcess()
    this.shellProcess.on('data', (data: string) => this.terminal?.write(data))
    this.shellProcess.on('exit', (code: number) => {
      this.terminal?.write(`\r\n\x1b[33m[Process exited: code ${code}]\x1b[0m\r\n`)
    })
    this.shellProcess.on('error', (err: Error) => {
      this.terminal?.write(`\r\n\x1b[31m[Error: ${err.message}]\x1b[0m\r\n`)
    })
    const cols = this.terminal?.cols ?? 80
    const rows = this.terminal?.rows ?? 30
    this.shellProcess.spawn({ ...profile, startupCommands: resolvedCommands }, cwd, cols, rows)
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect()
    this.shellProcess?.kill()
    this.terminal?.dispose()
    this.terminal = null
    this.shellProcess = null
  }
}
