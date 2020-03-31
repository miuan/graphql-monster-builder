const fs = require('fs');
const path = require('path');
import {
  Structure,
  StructureItem,
} from '../common/types';

export const STRUCTURE = {
  schema: { 
    dir: `ID/`,
    modules: ['schema.protectql'],
  },
  gen: { 
    dir: `ID/gen/`,
    modules: [],
  },
  models: { 
    dir:`ID/gen/models/`, 
    modules: [],
  },
  resolvers: { 
    dir:`ID/gen/resolvers/`, 
    modules: [],
  },
  services: { 
    dir:'ID/gen/services/', 
    modules: [],
  },
};

export const removeDirs = async (dir) => {
  if(!fs.existsSync(dir)){
    return
  } else if(!fs.lstatSync(dir).isDirectory()) {
    return fs.unlinkSync(dir);
  }
  
  if(/node_modules$/.test(dir)) {
    console.log(`skip dir: ${dir}`)
    return
  }

  console.log(`remove dir: '${dir}'`);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullfile = path.join(dir, file);
    const stats = fs.statSync(fullfile);
    if (stats.isDirectory()) {
      removeDirs(fullfile);
    } else if(! /yarn.lock$/.test(fullfile) && ! /package.json$/.test(fullfile)) {
      // also not remove 'yarn.lock
      fs.unlinkSync(fullfile);
    } else {
      console.log('skiped: ', fullfile)
    }
  }

  // if node modules stays then rm on root dir will fail
  try {
    fs.rmdirSync(dir);
  } catch (ex) {

  }
  
};

export const createDirs = (structure: Structure, baseDir: string = '') => {
  
  for (const str in structure) {
    if (str === 'id') {
      continue;
    }

    const dir = path.join(baseDir, structure[str].dir);
    // if node modules stays then rm on root dir was not removed
    try {
      fs.mkdirSync(dir);
    } catch (ex) {

    }
    
  }
};

export const generateStructure = (id, baseDir: string = './graphql/generated/'): Structure => {
  const structure: Structure = JSON.parse(JSON.stringify(STRUCTURE)) as Structure;
  
  structure.id = id;

  for (const str in structure) {
    if (str === 'id') {
      continue;
    }

    const item = structure[str];
    item.dir = path.join(baseDir, item.dir.replace('ID', id));
  }

  removeDirs(path.join(baseDir, id));
  createDirs(structure);

  return structure;
};


export const writeToFile = (item: StructureItem, name: string, content: string) => {
  const nameWithExt = name.indexOf('.') === -1 ? `${name}.ts` : name;
  const fullName = path.join(item.dir, nameWithExt);

  // some files should not be overrided 
  // for example the package.json 
  if(!fs.existsSync(fullName)){
    fs.writeFileSync(fullName, content);
    item.modules.push(name);
  }
};


export const templateToText = (templateName: string, params: any = null): string => {
  const templateFilePath = `./bd/templates/${templateName}`;
  let text = fs.readFileSync(templateFilePath).toString();
  
  if (params && params instanceof Object) {
    for (const key in params) {
      const search = new RegExp(key, 'g');
      text = text.replace(search, params[key]);
    }
  }

  return text;
};

export const templateToFile = (templateName: string, params: any) => {

};
