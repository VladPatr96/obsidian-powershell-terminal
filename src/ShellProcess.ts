import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { Profile } from './types'

export class ShellProcess extends EventEmitter {
  private proc: ChildProcess | null = null

  spawn(profile: Profile, cwd: string): void {
    this.proc = spawn(
      profile.shell,
      ['-NoLogo', '-NoExit', ...profile.args],
      {
        cwd,
        env: { ...process.env, ...profile.env },
        stdio: 'pipe',
        windowsHide: true,
      }
    )

    this.proc.stdout!.on('data', (chunk: Buffer) => {
      this.emit('data', chunk.toString('utf8'))
    })
    this.proc.stderr!.on('data', (chunk: Buffer) => {
      this.emit('data', chunk.toString('utf8'))
    })
    this.proc.on('exit', (code: number | null) => {
      this.emit('exit', code ?? -1)
      this.proc = null
    })
    this.proc.on('error', (err: Error) => {
      this.emit('error', err)
      this.proc = null
    })

    // Workaround: PowerShell без PTY использует 80 колонок по умолчанию
    setTimeout(() => {
      if (this.isAlive) {
        this.write('$Host.UI.RawUI.BufferSize = New-Object Management.Automation.Host.Size(200, 9999)\r\n')
      }
    }, 200)

    if (profile.startupCommands.length > 0) {
      setTimeout(() => {
        for (const cmd of profile.startupCommands) {
          this.write(cmd + '\r\n')
        }
      }, 500)
    }
  }

  write(data: string): void {
    if (!this.isAlive) return
    this.proc!.stdin!.write(data)
  }

  kill(): void {
    if (!this.isAlive) return
    this.proc!.kill()
    this.proc = null
  }

  get isAlive(): boolean {
    return this.proc !== null && this.proc.exitCode === null
  }

  get pid(): number | undefined {
    return this.proc?.pid
  }
}
