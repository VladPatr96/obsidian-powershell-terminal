// Запуск: node scripts/test-shell.mjs
import { spawn } from 'child_process'

const proc = spawn('powershell.exe', ['-NoLogo', '-NoExit', '-Command', '-'], {
  cwd: 'C:\\Users\\Патраваев',
  env: process.env,
  stdio: 'pipe',
  windowsHide: true,
})

proc.stdout.on('data', (chunk) => {
  process.stdout.write(chunk.toString())
})
proc.stderr.on('data', (chunk) => {
  process.stdout.write('[stderr] ' + chunk.toString())
})
proc.on('exit', (code) => {
  console.log(`\n[exit ${code}]`)
})

setTimeout(() => {
  console.log('\n>>> Sending: Get-Date')
  proc.stdin.write('Get-Date\r\n')
}, 800)

setTimeout(() => {
  console.log('\n>>> Sending: exit')
  proc.stdin.write('exit\r\n')
}, 3000)
