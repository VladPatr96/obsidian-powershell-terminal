import { Profile, PluginSettings } from './types'

let idCounter = Date.now()
const generateId = () => `profile-${++idCounter}`

export class ProfileManager {
  constructor(
    private settings: PluginSettings,
    private save: () => Promise<void>
  ) {}

  getAll(): Profile[] {
    return this.settings.profiles
  }

  getById(id: string): Profile | undefined {
    return this.settings.profiles.find((p) => p.id === id)
  }

  getDefault(): Profile {
    return this.getById(this.settings.defaultProfileId) ?? this.settings.profiles[0]
  }

  async add(profile: Omit<Profile, 'id'>): Promise<Profile> {
    const newProfile: Profile = { ...profile, id: generateId() }
    this.settings.profiles.push(newProfile)
    await this.save()
    return newProfile
  }

  async update(id: string, patch: Partial<Omit<Profile, 'id'>>): Promise<void> {
    const idx = this.settings.profiles.findIndex((p) => p.id === id)
    if (idx === -1) return
    this.settings.profiles[idx] = { ...this.settings.profiles[idx], ...patch }
    await this.save()
  }

  async remove(id: string): Promise<void> {
    if (this.settings.profiles.length <= 1) return
    this.settings.profiles = this.settings.profiles.filter((p) => p.id !== id)
    if (this.settings.defaultProfileId === id) {
      this.settings.defaultProfileId = this.settings.profiles[0].id
    }
    await this.save()
  }

  async setDefault(id: string): Promise<void> {
    if (!this.getById(id)) return
    this.settings.defaultProfileId = id
    await this.save()
  }
}
