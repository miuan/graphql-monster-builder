import * as fs from 'fs'
import { templateFileToText } from '../common/files'
import { SchemaModel, SchemaModelType } from '../common/types'
import { getModelsFromSchema } from '../parser/scan'
import { BackendDirectory } from './backendDirectory'
import { generateDataloaders } from './generators/dataloaders'
import { generateEntry } from './generators/entry'
import { generateIntegrationTests } from './generators/integration'
import { generateMongoModelToFile } from './generators/model'
import { createModelTypeFromModel } from './generators/model-types'
import { generateResolverToFile } from './generators/resolvers'
import { generateSchema } from './generators/schema'
import { generateServiceToFile } from './generators/service'

export const exportAs = async (name, from, base = '.', config = {}) => {
    const importedSchema = fs.readFileSync(from, { encoding: 'utf8' })
    return exportAsFromString(name, importedSchema, base, config)
}

export const exportAsFromString = async (name, importedSchema, outDir = '.', config = {}) => {
    const models = await getModelsFromSchema(importedSchema)

    const backendDirectory = new BackendDirectory()
    backendDirectory.init(name, outDir)
    // TODO: in some times 'services/' is not used,
    //       so not create directory what is not necessary
    backendDirectory.prepareDirectory()

    generateAll(backendDirectory, models, config)

    backendDirectory.writeWithConfig('server', config)
    backendDirectory.writeWithConfig('sendMail', config, 'services')
    backendDirectory.writeWithConfig('passport', config, 'services')
    backendDirectory.writeWithConfig('extras', config, 'gen')
    backendDirectory.writeWithConfig('storage.t', config, 'gen')

    backendDirectory.genWrite(`schemaLoad`, templateFileToText(`schemaLoad.ts`, null))

    backendDirectory.genWrite(`services/db`, templateFileToText(`db.ts`, null))
    backendDirectory.genWrite(`source.schema`, importedSchema)
    backendDirectory.write(`package.json`, templateFileToText(`package.json`, null))
    backendDirectory.genWrite(`integration-tests/helper.ts`, templateFileToText(`integration-test-helper.ts`, null))
}

export function generateAll(backendDirectory: BackendDirectory, models: SchemaModel[], config: {integrationTestsEnable?: boolean}) {
    generateSchema(backendDirectory, models)

    let typesAll = `import { Document } from 'mongoose'\n`
    for (const model of models) {
        const notVirtualMembers = model.members.filter((member) => !member.isVirtual)
        generateMongoModelToFile(backendDirectory, model, notVirtualMembers)
        typesAll += createModelTypeFromModel(model, notVirtualMembers)

        generateServiceToFile(backendDirectory, model)
        if(model.type === SchemaModelType.MODEL) generateResolverToFile(backendDirectory, model)
    }

    backendDirectory.genWrite(`model-types.ts`, typesAll)

    generateDataloaders(backendDirectory, models)

    if (config.integrationTestsEnable) generateIntegrationTests(backendDirectory, models)

    generateEntry(backendDirectory, models)
}

