import { App, PluginSettingTab } from 'obsidian'
import type PowerShellTerminalPlugin from './main'

export class SettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: PowerShellTerminalPlugin) {
    super(app, plugin)
  }

  display(): void {
    this.containerEl.empty()
    this.containerEl.createEl('h2', { text: 'PowerShell Terminal — Settings coming soon' })
  }
}
