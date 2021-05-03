import { templateFileToText} from './common/files';
import { getModelsFromSchema } from './parser/scan';
import { generateModels } from './backend/generators/model';
import { generateServices } from './backend/generators/service';
import { generateResolvers } from './backend/generators/resolvers';
import { generateDataloaders } from './backend/generators/dataloaders';
import { generateEntry } from './backend/generators/entry';
import * as fs from 'fs';
import { Schema } from 'inspector';
import { generateSchema } from './backend/generators/schema';
import { generateModelTypes } from './backend/generators/model-types';
import { BackendDirectory } from './backend/backendDirectory';
import * as _ from 'lodash'

export const exportAs = async (name, from, base='.') => {
  
  const importedSchema = fs.readFileSync(from, { encoding: 'utf8' });
  return exportAsFromString(name, importedSchema, base)
}

export const exportAsFromString = async (name, importedSchema, outDir='.', config={}) => {
  const models = await getModelsFromSchema(importedSchema);
 
  const backendDirectory = new BackendDirectory()
  backendDirectory.init(name, outDir)
  backendDirectory.prepareDirectory()

  generateSchema(backendDirectory, models);
  generateModels(backendDirectory, models);
  generateServices(backendDirectory, models);
  generateResolvers(backendDirectory, models);
  generateDataloaders(backendDirectory, models);
  generateModelTypes(backendDirectory, models);

  generateEntry(backendDirectory, models);

  backendDirectory.write(`server`, templateFileToText(`server.ts`, null))
  backendDirectory.write(`services/sendMail`, _.get(config, 'templates.sendMail') || templateFileToText(`sendMail.ts`, null))

  backendDirectory.genWrite( `schemaLoad`, templateFileToText(`schemaLoad.ts`, null));
  backendDirectory.genWrite( `extras`, templateFileToText(`extras.ts`, null));
  backendDirectory.genWrite( `services/db`, templateFileToText(`db.ts`, null));
  backendDirectory.genWrite( `source.schema`, importedSchema);
  backendDirectory.write( `package.json`, templateFileToText(`package.json`, null));
  
}
