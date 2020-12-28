const fs = require('fs');
const path = require('path');
import loglevel from '../log'
import { setupModelsRelations } from '../parser/relations';
const log = loglevel.getLogger('files')

import {
  Structure,
  StructureItem,
} from './types';



export const removeDirs = (dir, force = false) => {
  if(!fs.existsSync(dir)){
    return
  } else if(!fs.lstatSync(dir).isDirectory()) {
    return fs.unlinkSync(dir);
  }
  
  if(/node_modules$/.test(dir)) {
    log.trace(`skip dir: ${dir}`)
    return
  }

  if(/^.git/.test(dir)) {
    log.trace(`skip dir: ${dir}`)
    return
  }


  log.info(`remove dir: '${dir}'`);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullfile = path.join(dir, file);
    const stats = fs.statSync(fullfile);
    if (stats.isDirectory()) {
      removeDirs(fullfile);
    } else if( ! /yarn.lock$/.test(fullfile) 
               ) {
      // also not remove 'yarn.lock
      fs.unlinkSync(fullfile);
    } else {
      log.trace('skiped: ', fullfile)
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
      fs.mkdirSync(dir, { recursive: true })
      log.info(`Create dir: ${dir}`)
    } catch (ex) {

    }
    
  }
};


export const writeToFile = (item: StructureItem, name: string, content: string): boolean => {
  const nameWithExt = name.indexOf('.') === -1 ? `${name}.ts` : name;
  const fullName = path.join(item.dir, nameWithExt);

  // some files should not be overrided 
  // for example the package.json 
  if(!fs.existsSync(fullName)){
    fs.writeFileSync(fullName, content)
    item.modules.push(name);
  }

  return true
};



export const templateToText = (text: string, params: any) => {
  if (params && params instanceof Object) {
    for (const key in params) {
      const search = new RegExp(key, 'g');
      text = text.replace(search, params[key]);
    }
  }

  return text
}

export const templateFileToText = (fileName: string, params: any = null): string => {
  const templateFilePath = path.join(__dirname, '../../', 'services/backend/templates', fileName)
  //const templateFilePath = `services/backend/templates/${fileName}`;
  let text = fs.readFileSync(templateFilePath).toString();
  
  return templateToText(text, params);
};

export const templateToFile = (templateName: string, params: any) => {

};
