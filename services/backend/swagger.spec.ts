import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as swaggerJSDoc from 'swagger-jsdoc'
import { exportAsFromString } from './build'

describe('generated Swagger documentation', () => {
    let directory: string
    beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gmb-swagger-')) })
    afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }) })

    it('discovers generated annotations and preserves CRUD and authentication endpoints', async () => {
        const output = path.join(directory, 'server with spaces')
        await exportAsFromString('swagger-test', fs.readFileSync('examples/todo.schema', 'utf8'), output)
        const document = swaggerJSDoc({
            definition: { openapi: '3.0.0', info: { title: 'Generated server', version: '1.0.0' } },
            apis: [path.join(output, 'gen/**/*.ts')],
            failOnErrors: true,
        }) as any
        expect(document.openapi).toBe('3.0.0')
        expect(document.paths['/api/todo'].post.tags).toContain('create')
        expect(document.paths['/api/todo/{id}']).toEqual(expect.objectContaining({
            get: expect.any(Object), put: expect.any(Object), delete: expect.any(Object),
        }))
        expect(document.paths['/api/todo/all'].get).toBeDefined()
        expect(document.paths['/api/todo/count'].get).toBeDefined()
        expect(document.paths['/auth/login_v1'].post).toBeDefined()
        expect(document.paths['/auth/register_v1'].post).toBeDefined()
        expect(document.components.schemas.Todo.properties.message.type).toBe('string')
    })
})
