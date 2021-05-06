import { templateFileToText} from '../services/common/files';
import { getModelsFromSchema } from '../services/parser/scan';
import * as fs from 'fs';
import * as _ from 'lodash'
import { FrontendDirectory } from './frontendDirectory';
import generateMutations from './generators/mutations';
import generateFragments from './generators/fragments';
import generateQueries from './generators/queries';
import generateLists from './generators/lists';
import generateEdits from './generators/edits';

export const frontendFromSchema = async (name, from, base='.') => {
  
  const importedSchema = fs.readFileSync(from, { encoding: 'utf8' });
  return exportAsFromString(name, importedSchema, base)
}

export const exportAsFromString = async (name, importedSchema, outDir='.', config={}) => {
  const models = await getModelsFromSchema(importedSchema);
 
  const frontendDirectory = new FrontendDirectory()
  

  for (const model of models) {
    frontendDirectory.structure[model.modelName] = { 
      dir:`ID/src/gen/${model.modelName}`, 
      modules: [],
    }

    frontendDirectory.structure[model.modelName] = { 
      dir:`ID/src/gen/${model.modelName}/graphql`, 
      modules: [],
    }

  }
  
  frontendDirectory.init(name, outDir)
  // TODO: in some times 'services/' is not used,
  //       so not create directory what is not necessary
  frontendDirectory.prepareDirectory()


  generateMutations(frontendDirectory, models)
  generateFragments(frontendDirectory, models)
  generateQueries(frontendDirectory, models)
  generateLists(frontendDirectory, models)
  generateEdits(frontendDirectory, models)
}


