import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { graphql } from 'graphql'
import { schemaLoad, addInjectionToMergedResolvers } from './schemaLoad'

describe('schema loading with patched GraphQL Tools', () => {
    let directory: string
    beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gmb-schema-')) })
    afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }) })

    it('builds and executes a schema from multiple resolver injections', async () => {
        const file = path.join(directory, 'schema.graphql')
        fs.writeFileSync(file, 'scalar DateTime\ntype Query { hello: String! }\ntype Mutation { echo(value: String!): String! }')
        const schema = schemaLoad([
            { Query: { hello: () => 'hello' } },
            { Mutation: { echo: (_root, { value }) => value } },
        ], file)
        expect(await graphql({ schema, source: '{ hello }' })).toEqual({ data: { hello: 'hello' } })
        expect(await graphql({ schema, source: 'mutation { echo(value: "test") }' })).toEqual({ data: { echo: 'test' } })
    })

    it('rejects duplicate resolver definitions instead of overwriting them', () => {
        const merged = { Query: { hello: () => 'original' } }
        expect(() => addInjectionToMergedResolvers(merged, { Query: { hello: () => 'replacement' } })).toThrow()
    })
})
