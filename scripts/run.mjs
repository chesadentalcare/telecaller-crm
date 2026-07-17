import { spawn } from 'node:child_process'
import path from 'node:path'

const mode = process.argv[2] || 'dev'
const appEnv = process.argv[3] || 'dev'
const port = process.argv[4] || process.env.PORT || '3001'

const binDir = path.resolve('node_modules', '.bin')
const env = {
  ...process.env,
  NEXT_PUBLIC_APP_ENV: appEnv,
  PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
}

const args = mode === 'dev' ? [mode, '-p', port] : [mode]

console.log(`\n▶ next ${mode}  —  backend: ${appEnv.toUpperCase()}${mode === 'dev' ? `  port: ${port}` : ''}\n`)

const child = spawn('next', args, { stdio: 'inherit', shell: true, env })
child.on('exit', (code) => process.exit(code ?? 0))
