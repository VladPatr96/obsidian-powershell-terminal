import { Plugin, WorkspaceLeaf } from 'obsidian'
import { TerminalView, VIEW_TYPE } from './TerminalView'
import { ProfileManager } from './ProfileManager'
import { SettingsTab } from './SettingsTab'
import { PluginSettings, DEFAULT_SETTINGS } from './types'

export default class PowerShellTerminalPlugin extends Plugin {
  settings!: PluginSettings
  profileManager!: ProfileManager

  async onload(): Promise<void> {
    await this.loadSettings()
    this.profileManager = new ProfileManager(this.settings, () => this.saveSettings())

    this.registerView(VIEW_TYPE, (leaf) => new TerminalView(leaf, this))
    this.addSettingTab(new SettingsTab(this.app, this))

    this.addCommand({
      id: 'open-terminal',
      name: 'Open Terminal',
      callback: () => this.activateView(),
    })

    this.addRibbonIcon('terminal', 'Open Terminal', () => this.activateView())
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
