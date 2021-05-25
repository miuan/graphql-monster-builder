import { templateFileToText} from '../common/files';
import { getModelsFromSchema } from '../parser/scan';
import { generateModels } from './generators/model';
import { generateServices } from './generators/service';
import { generateResolvers } from './generators/resolvers';
import { generateDataloaders } from './generators/dataloaders';
import { generateEntry } from './generators/entry';
import * as fs from 'fs';

import { generateSchema } from './generators/schema';
import { generateModelTypes } from './generators/model-types';
import { BackendDirectory } from './backendDirectory';
import * as _ from 'lodash'
import { generateIntegrationTests } from './generators/integration';

export const exportAs = async (name, from, base='.', config={}) => {
  
  const importedSchema = fs.readFileSync(from, { encoding: 'utf8' });
  return exportAsFromString(name, importedSchema, base, config)
}

export const exportAsFromString = async (name, importedSchema, outDir='.', config={}) => {
  const models = await getModelsFromSchema(importedSchema);
 
  const backendDirectory = new BackendDirectory()
  backendDirectory.init(name, outDir)
  // TODO: in some times 'services/' is not used,
  //       so not create directory what is not necessary
  backendDirectory.prepareDirectory()

  generateSchema(backendDirectory, models);
  generateModels(backendDirectory, models);
  generateServices(backendDirectory, models);
  generateResolvers(backendDirectory, models);
  generateDataloaders(backendDirectory, models);
  generateModelTypes(backendDirectory, models);
  generateIntegrationTests(backendDirectory, models);

  generateEntry(backendDirectory, models);

  backendDirectory.writeWithConfig('server', config)
  backendDirectory.writeWithConfig('sendMail', config, 'services')
  backendDirectory.writeWithConfig('passport', config, 'services')
  backendDirectory.writeWithConfig('extras', config, 'gen');

  backendDirectory.genWrite( `schemaLoad`, templateFileToText(`schemaLoad.ts`, null));

  backendDirectory.genWrite( `services/db`, templateFileToText(`db.ts`, null));
  backendDirectory.genWrite( `source.schema`, importedSchema);
  backendDirectory.write( `package.json`, templateFileToText(`package.json`, null));
  
}
