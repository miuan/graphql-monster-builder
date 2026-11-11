import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export const ensureGeneratedJwtSecret = (outDir: string) => {
    const environmentDir = path.join(outDir, 'config/environment')
    fs.mkdirSync(environmentDir, { recursive: true })
    const environmentFile = path.join(environmentDir, '.env.defaults')
    const existing = fs.existsSync(environmentFile) ? fs.readFileSync(environmentFile, 'utf8') : ''
    if (!/^\s*(?:export\s+)?JWT_TOKEN_SECRET_GEN\s*=/m.test(existing)) {
        const secret = crypto.randomBytes(32).toString('hex')
        fs.appendFileSync(environmentFile, `${existing && !existing.endsWith('\n') ? '\n' : ''}JWT_TOKEN_SECRET_GEN=${secret}\n`, { mode: 0o600 })
    }

    const ignoreFile = path.join(outDir, '.gitignore')
    const ignored = fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : ''
    if (!ignored.split(/\r?\n/).includes('/config/environment/.env.defaults')) {
        fs.appendFileSync(ignoreFile, `${ignored && !ignored.endsWith('\n') ? '\n' : ''}/config/environment/.env.defaults\n`)
    }
}
