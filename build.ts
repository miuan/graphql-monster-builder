import { generateStructure, templateToText, writeToFile } from './common/files';
import { getModelsFromSchema } from './parser/scan';
import { generateModels } from './bd/generators/model';
import { generateServices } from './bd/generators/service';
import { generateResolvers } from './bd/generators/resolvers';
import { generateDataloaders } from './bd/generators/dataloaders';
import { generateEntry } from './bd/generators/entry';
import * as fs from 'fs';
import { Schema } from 'inspector';
import { generateSchema } from './bd/generators/schema';



export const exportAs = async (name, from, base='.') => {
  
  const importedSchema = fs.readFileSync(from, { encoding: 'UTF8' });
  const models = await getModelsFromSchema(importedSchema);
 
  const structure = generateStructure(name, base);
  generateSchema(structure, models);
  generateModels(structure, models);
  generateServices(structure, models);
  generateResolvers(structure, models);
  generateDataloaders(structure, models);

  generateEntry(structure, models);


  const server = templateToText('server.ts', null);
  writeToFile(structure.schema, `server`, server);

  writeToFile(structure.schema, `gen/schemaLoad`, templateToText('schemaLoad.ts', null));
  writeToFile(structure.schema, `gen/extras`, templateToText('extras.ts', null));
  writeToFile(structure.schema, `gen/services/db`, templateToText('db.ts', null));
  writeToFile(structure.schema, `package.json`, templateToText('package.json', null));
};




