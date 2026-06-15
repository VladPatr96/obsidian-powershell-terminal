import { readFileSync } from 'fs'

const buf = readFileSync('C:/Users/Патраваев/AppData/Local/Programs/Obsidian/resources/app.asar')
const headerSize = buf.readUInt32LE(12)
const header = JSON.parse(buf.slice(16, 16 + headerSize).toString())

const pkgEntry = header.files['package.json']
const dataOffset = 16 + headerSize
const offset = dataOffset + Number(pkgEntry.offset)
const content = buf.slice(offset, offset + pkgEntry.size).toString()
const json = JSON.parse(content)

console.log('Obsidian version:', json.version)
if (json.devDependencies?.electron) {
  console.log('Electron (devDeps):', json.devDependencies.electron)
}
console.log('All fields:', Object.keys(json).join(', '))
