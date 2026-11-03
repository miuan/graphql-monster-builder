import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as dotenv from 'dotenv-flow'
import { ensureGeneratedJwtSecret } from './jwt-config'

describe('generated JWT configuration', () => {
    let directory: string
    beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gmb-jwt-')) })
    afterEach(() => { fs.rmdirSync(directory, { recursive: true }) })

    it('creates a private secret, loads it through dotenv-flow and preserves it on regeneration', () => {
        ensureGeneratedJwtSecret(directory)
        const file = path.join(directory, 'config/environment/.env.defaults')
        const first = fs.readFileSync(file, 'utf8')
        expect(first).toMatch(/^JWT_TOKEN_SECRET_GEN=[a-f0-9]{64}\n$/)
        expect(fs.statSync(file).mode & 0o777).toBe(0o600)
        const previous = process.env.JWT_TOKEN_SECRET_GEN
        delete process.env.JWT_TOKEN_SECRET_GEN
        try {
            dotenv.config({ path: path.dirname(file), silent: true })
            expect(process.env.JWT_TOKEN_SECRET_GEN).toBe(first.trim().split('=')[1])
        } finally {
            if (previous === undefined) delete process.env.JWT_TOKEN_SECRET_GEN
            else process.env.JWT_TOKEN_SECRET_GEN = previous
        }
        ensureGeneratedJwtSecret(directory)
        expect(fs.readFileSync(file, 'utf8')).toBe(first)
        expect(fs.readFileSync(path.join(directory, '.gitignore'), 'utf8')).toBe('/config/environment/.env.defaults\n')
    })

    it('preserves existing configuration and generates different secrets for different servers', () => {
        const environmentDir = path.join(directory, 'config/environment')
        fs.mkdirSync(environmentDir, { recursive: true })
        fs.writeFileSync(path.join(environmentDir, '.env.defaults'), 'PORT=3101')
        ensureGeneratedJwtSecret(directory)
        expect(fs.readFileSync(path.join(environmentDir, '.env.defaults'), 'utf8')).toMatch(/^PORT=3101\nJWT_TOKEN_SECRET_GEN=/)
        const other = path.join(directory, 'other')
        ensureGeneratedJwtSecret(other)
        expect(fs.readFileSync(path.join(other, 'config/environment/.env.defaults'), 'utf8')).not.toBe(
            fs.readFileSync(path.join(environmentDir, '.env.defaults'), 'utf8').replace('PORT=3101\n', ''),
        )
    })
})
