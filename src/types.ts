export interface Profile {
  id: string
  name: string
  shell: string
  args: string[]
  env: Record<string, string>
  startupCommands: string[]
  startDir: 'vault' | 'home' | 'custom'
  customStartDir: string
  fontSize: number
  fontFamily: string
  theme: 'dark' | 'light' | 'auto'
}

export interface PluginSettings {
  profiles: Profile[]
  defaultProfileId: string
  scrollbackLines: number
}

export const DEFAULT_PROFILE: Profile = {
  id: 'default-win32',
  name: 'PowerShell',
  shell: 'powershell.exe',
  args: [],
  env: {},
  startupCommands: [],
  startDir: 'vault',
  customStartDir: '',
  fontSize: 14,
  fontFamily: 'Consolas, monospace',
  theme: 'auto',
}

export const DEFAULT_SETTINGS: PluginSettings = {
  profiles: [DEFAULT_PROFILE],
  defaultProfileId: 'default-win32',
  scrollbackLines: 1000,
}
