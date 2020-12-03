import path = require("path")
import * as files from "../common/files"
import { Structure } from "../common/types"
  
export const BACKEND_STRUCTURE = {
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
  
export interface BackendStructureOperatorWrite {
    write: (file: string, data: string) => boolean
    genWrite: (file: string, data: string) => boolean
    modelsWrite: (file: string, data: string) => boolean
    resolversWrite: (file: string, data: string) => boolean
    servicesWrite: (file: string, data: string) => boolean
}

export class BackendDirectory implements BackendStructureOperatorWrite {
    structure: Structure
    baseDir: string
    projectName: string

    constructor() {
        this.structure = JSON.parse(JSON.stringify(BACKEND_STRUCTURE)) as Structure
    }

    /**
     * 
     * @param projectName project name
     * @param baseDir base dir
     */
    init(projectName: string, baseDir: string = './graphql/generated/'){
        this.projectName = projectName
        this.baseDir = baseDir

        const outDir = projectName
        this.structure.id = projectName.replace('../', '');
      
        for (const str in this.structure) {
          if (str === 'id') {
            continue;
          }
      
          const item = this.structure[str];
          item.dir = path.join(baseDir, item.dir.replace('ID', outDir));
        }
    }

    /**
     * create or clean directory for copy files
     */
    prepareDirectory(){
        if(!this.baseDir || !this.projectName) {
            throw new Error('this.projectName or this.baseDir are empty, call init() fist')
        }

        files.removeDirs(path.join(this.baseDir, this.projectName, 'gen'));
        files.createDirs(this.structure)
    }
    
    public write(file: string, data: string){
        return files.writeToFile(this.structure.schema, file, data)
    }

    public genWrite(file: string, data: string){
        return files.writeToFile(this.structure.gen, file, data)
    }

    modelsWrite(file: string, data: string){
        return files.writeToFile(this.structure.models, file, data)
    }

    resolversWrite(file: string, data: string){
        return files.writeToFile(this.structure.resolvers, file, data)
    }

    servicesWrite(file: string, data: string){
        return files.writeToFile(this.structure.services, file, data)
    }
  
  }