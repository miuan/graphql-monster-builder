import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { exportAsFromString } from './build'
import { filterValue as graphqlFilterValue, PATHIS } from './templates/extras'
import { filterValue as restFilterValue } from './templates/api/api-utils.t'

describe.each([
    ['GraphQL', graphqlFilterValue],
    ['REST', restFilterValue],
])('%s filter lookup without Lodash', (_name, filterValue) => {
    it.each([
        [{ user: { id: 'actor' } }, 'user.id', { value: 'actor', path: [], pathIs: PATHIS.ALWAYS }],
        [{ AND: [{ user: { id: 'actor' } }] }, 'user.id', { value: 'actor', path: ['AND'], pathIs: PATHIS.ALWAYS }],
        [{ OR: [{ user: { id: 'actor' } }] }, 'user.id', { value: 'actor', path: ['OR'], pathIs: PATHIS.SOME }],
        [{ 'user.id': 'actor' }, 'user.id', { value: 'actor', path: [], pathIs: PATHIS.ALWAYS }],
        [{ done: false }, 'done', { value: false, path: null, pathIs: PATHIS.NEVER }],
        [{ score: 0 }, 'score', { value: 0, path: null, pathIs: PATHIS.NEVER }],
        [{}, 'user.id', { value: null, path: null, pathIs: PATHIS.NEVER }],
        [{ AND: [{ user: { id: 'a' } }, { user: { id: 'b' } }] }, 'user.id', { pathIs: PATHIS.UNDETERMINED }],
    ])('preserves lookup and authorization classification for %j', (filter, name, expected) => {
        expect(filterValue(filter, name)).toEqual(expected)
    })
})

it('generates server sources and a manifest without direct Lodash usage', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gmb-no-lodash-'))
    try {
        await exportAsFromString('no-lodash', 'model Todo { title: String }', directory)
        const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
        expect(manifest.dependencies).not.toHaveProperty('lodash')
        expect(manifest.devDependencies).not.toHaveProperty('lodash')
        const checkSources = (folder: string) => {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
                const file = path.join(folder, entry.name)
                if (entry.isDirectory()) checkSources(file)
                else if (file.endsWith('.ts')) expect(fs.readFileSync(file, 'utf8')).not.toMatch(/['"]lodash(?:\/[^'"]*)?['"]/)
            }
        }
        checkSources(directory)
    } finally {
        fs.rmSync(directory, { recursive: true, force: true })
    }
})
