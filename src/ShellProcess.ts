import { EventEmitter } from 'events'
import { join } from 'path'
import { Profile } from './types'
import type { IPty, IWindowsPtyForkOptions } from 'node-pty'

type NodePtyModule = {
  spawn(file: string, args: string[], options: IWindowsPtyForkOptions): IPty
}

let _pluginDir = ''
let _nodePty: NodePtyModule | null = null

// Called from main.ts onload() before any terminal is opened
export function setPluginDir(dir: string): void {
  _pluginDir = dir
  _nodePty = null // reset cache if plugin dir changes
}

function getNodePty(): NodePtyModule {
  if (!_nodePty) {
    if (!_pluginDir) throw new Error('PowerShell Terminal: plugin dir not initialised')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _nodePty = require(join(_pluginDir, 'node_modules', 'node-pty')) as NodePtyModule
  }
  return _nodePty
}

export class ShellProcess extends EventEmitter {
  private pty: IPty | null = null

  spawn(profile: Profile, cwd: string, cols: number, rows: number): void {
    const pty = getNodePty()
    this.pty = pty.spawn(profile.shell, profile.args, {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env: { ...process.env, ...profile.env } as Record<string, string>,
      useConpty: true,
    })

    this.pty.onData((data: string) => this.emit('data', data))
    this.pty.onExit(({ exitCode }: { exitCode: number }) => {
      this.emit('exit', exitCode)
      this.pty = null
    })

    if (profile.startupCommands.length > 0) {
      setTimeout(() => {
        for (const cmd of profile.startupCommands) {
          this.write(cmd + '\r')
        }
      }, 500)
    }
  }

  write(data: string): void {
    if (!this.pty) return
    try { this.pty.write(data) } catch {}
  }

  resize(cols: number, rows: number): void {
    if (!this.pty) return
    try { this.pty.resize(cols, rows) } catch {}
  }

  kill(): void {
    if (!this.pty) return
    try { this.pty.kill() } catch {}
    this.pty = null
  }

  get isAlive(): boolean { return this.pty !== null }
  get pid(): number | undefined { return this.pty?.pid }
}
