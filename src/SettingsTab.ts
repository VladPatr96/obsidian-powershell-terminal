import { App, Modal, PluginSettingTab, Setting } from 'obsidian'
import type PowerShellTerminalPlugin from './main'
import { Profile, DEFAULT_PROFILE } from './types'

export class SettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: PowerShellTerminalPlugin) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    new Setting(containerEl).setName('PowerShell Terminal').setHeading()

    new Setting(containerEl)
      .setName('Scrollback lines')
      .setDesc('Number of lines kept in terminal history (restart terminal to apply)')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.scrollbackLines))
          .onChange(async (value) => {
            const n = parseInt(value)
            if (!isNaN(n) && n > 0) {
              this.plugin.settings.scrollbackLines = n
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(containerEl).setName('Profiles').setHeading()

    for (const profile of this.plugin.profileManager.getAll()) {
      this.renderProfileRow(containerEl, profile)
    }

    new Setting(containerEl).addButton((btn) =>
      btn.setButtonText('Add profile').onClick(async () => {
        await this.plugin.profileManager.add({ ...DEFAULT_PROFILE, name: 'New profile' })
        this.display()
      })
    )
  }

  private renderProfileRow(containerEl: HTMLElement, profile: Profile): void {
    const isDefault = profile.id === this.plugin.settings.defaultProfileId
    new Setting(containerEl)
      .setName(profile.name + (isDefault ? '  ✓ default' : ''))
      .setDesc(`${profile.shell}  |  start: ${profile.startDir}`)
      .addButton((btn) =>
        btn.setButtonText('Edit').onClick(() => {
          new ProfileModal(this.app, this.plugin, profile, () => this.display()).open()
        })
      )
      .addButton((btn) =>
        btn
          .setButtonText('Set default')
          .setDisabled(isDefault)
          .onClick(async () => {
            await this.plugin.profileManager.setDefault(profile.id)
            this.display()
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText('Delete')
          .setDisabled(this.plugin.profileManager.getAll().length <= 1)
          .onClick(async () => {
            await this.plugin.profileManager.remove(profile.id)
            this.display()
          })
      )
  }
}

class ProfileModal extends Modal {
  constructor(
    app: App,
    private plugin: PowerShellTerminalPlugin,
    private profile: Profile,
    private onSave: () => void
  ) {
    super(app)
  }

  onOpen(): void {
    const { contentEl } = this

    new Setting(contentEl).setName(`Edit profile: ${this.profile.name}`).setHeading()

    const draft: Profile = { ...this.profile }

    new Setting(contentEl).setName('Name').addText((t) =>
      t.setValue(draft.name).onChange((v) => (draft.name = v))
    )

    new Setting(contentEl)
      .setName('Shell executable')
      .setDesc('e.g. powershell.exe, pwsh.exe, cmd.exe')
      .addText((t) => t.setValue(draft.shell).onChange((v) => (draft.shell = v)))

    new Setting(contentEl)
      .setName('Arguments')
      .setDesc('Space-separated, e.g. -NoLogo -NoExit')
      .addText((t) =>
        t
          .setValue(draft.args.join(' '))
          .onChange((v) => (draft.args = v.split(' ').filter(Boolean)))
      )

    new Setting(contentEl)
      .setName('Start directory')
      .addDropdown((d) =>
        d
          .addOption('vault', 'Vault root')
          .addOption('home', 'Home directory')
          .addOption('custom', 'Custom path')
          .setValue(draft.startDir)
          .onChange((v) => (draft.startDir = v as Profile['startDir']))
      )

    new Setting(contentEl)
      .setName('Custom start path')
      .setDesc('Only used when start directory = custom')
      .addText((t) =>
        t.setValue(draft.customStartDir).onChange((v) => (draft.customStartDir = v))
      )

    new Setting(contentEl)
      .setName('Startup commands')
      .setDesc('One command per line. Use {{vault}} for vault path.')
      .addTextArea((ta) =>
        ta
          .setValue(draft.startupCommands.join('\n'))
          .onChange((v) => (draft.startupCommands = v.split('\n').filter(Boolean)))
      )

    new Setting(contentEl)
      .setName('Environment variables')
      .setDesc('One per line: KEY=VALUE')
      .addTextArea((ta) =>
        ta
          .setValue(Object.entries(draft.env).map(([k, v]) => `${k}=${v}`).join('\n'))
          .onChange((v) => {
            draft.env = {}
            v.split('\n').filter(Boolean).forEach((line) => {
              const idx = line.indexOf('=')
              if (idx > 0) draft.env[line.slice(0, idx)] = line.slice(idx + 1)
            })
          })
      )

    new Setting(contentEl).setName('Font size').addText((t) =>
      t
        .setValue(String(draft.fontSize))
        .onChange((v) => (draft.fontSize = parseInt(v) || 14))
    )

    new Setting(contentEl).setName('Font family').addText((t) =>
      t.setValue(draft.fontFamily).onChange((v) => (draft.fontFamily = v))
    )

    new Setting(contentEl).setName('Theme').addDropdown((d) =>
      d
        .addOption('auto', 'Follow Obsidian theme')
        .addOption('dark', 'Dark')
        .addOption('light', 'Light')
        .setValue(draft.theme)
        .onChange((v) => (draft.theme = v as Profile['theme']))
    )

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Save')
          .setCta()
          .onClick(async () => {
            await this.plugin.profileManager.update(this.profile.id, draft)
            this.onSave()
            this.close()
          })
      )
      .addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()))
  }

  onClose(): void {
    this.contentEl.empty()
  }
}
