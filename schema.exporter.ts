import * as fs from 'fs';
import { Schema } from 'inspector';
import { getModelsFromSchema } from './exporter/scan';

import {
  SchemaModel,
  SchemaModelRelationType,
  Structure,
} from '../common/types';

import {
  cleanApplayedRelations,
  generateSchema,
} from './generators/schema';

import {
  generateStructure,
  createDirs,
  removeDirs,
} from './exporter/files';

import { fork } from 'cluster';
import {  } from './generators/schema';

export const schemaExport = async (name: string, exportName: string = null) => {
  let eName = exportName;
  if (!exportName) {
    eName = name + '.superql';
  }

  const id = '1';

  const importedSchema = fs.readFileSync(name, { encoding: 'UTF8' });

  const exportedSchema = await schemaExportWorker(importedSchema);

  const structure:Structure = generateStructure(id);

  fs.writeFileSync(eName, exportedSchema);

  return importedSchema;
};

export const schemaExportWorker = async (importedSchema: string): Promise<string> => {
  
  const models = await getModelsFromSchema(importedSchema);

  cleanApplayedRelations();

  return generateSchema(models);
};
