import { FileSystemAdapter, Plugin } from 'obsidian'
import { join } from 'path'
import { TerminalView, VIEW_TYPE } from './TerminalView'
import { ProfileManager } from './ProfileManager'
import { SettingsTab } from './SettingsTab'
import { PluginSettings, DEFAULT_SETTINGS } from './types'
import { setPluginDir } from './ShellProcess'
import { isNodePtyInstalled, installNodePty } from './NodePtyInstaller'

export default class PowerShellTerminalPlugin extends Plugin {
  settings!: PluginSettings
  profileManager!: ProfileManager

  async onload(): Promise<void> {
    await this.loadSettings()
    this.profileManager = new ProfileManager(this.settings, () => this.saveSettings())

    const adapter = this.app.vault.adapter as FileSystemAdapter
    const pluginDir = join(adapter.basePath, this.app.vault.configDir, 'plugins', this.manifest.id)
    setPluginDir(pluginDir)

    if (process.platform === 'win32' && !isNodePtyInstalled(pluginDir)) {
      await installNodePty(pluginDir)
    }

    this.registerView(VIEW_TYPE, (leaf) => new TerminalView(leaf, this))
    this.addSettingTab(new SettingsTab(this.app, this))

    this.addCommand({
      id: 'open-terminal',
      name: 'Open terminal',
      callback: () => { void this.activateView() },
    })

    this.addRibbonIcon('terminal', 'Open terminal', () => { void this.activateView() })

    const statusBarItem = this.addStatusBarItem()
    statusBarItem.setText('⬛ Terminal')
    statusBarItem.addClass('pst-status-bar-item')
    statusBarItem.addEventListener('click', () => { void this.activateView() })
  }

  onunload(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => leaf.detach())
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app
    const existing = workspace.getLeavesOfType(VIEW_TYPE)

    if (existing.length > 0) {
      workspace.revealLeaf(existing[0])
      return
    }

    const leaf = workspace.getLeaf('tab')
    await leaf.setViewState({ type: VIEW_TYPE, active: true })
    workspace.revealLeaf(leaf)
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    if (!this.settings.profiles?.length) {
      this.settings = { ...DEFAULT_SETTINGS }
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings)
  }
}
