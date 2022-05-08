import path = require('path')
import * as files from '../common/files'
import { StructureFrontend } from '../common/types'

export const FRONTEND_STRUCTURE = {
    index: {
        dir: `ID/`,
        modules: [],
    },
    src: {
        dir: `ID/src/`,
        modules: [],
    },
    gen: {
        dir: `ID/src/gen/`,
        modules: [],
    },
    graphql: {
        dir: `ID/src/gen/graphql/`,
        modules: [],
    },
}

export interface BackendStructureOperatorWrite {
    write: (file: string, data: string) => boolean
    genWrite: (file: string, data: string) => boolean
    graphqlWrite: (file: string, data: string) => boolean
}

export class FrontendDirectory implements BackendStructureOperatorWrite {
    structure: StructureFrontend
    baseDir: string
    projectName: string

    constructor() {
        this.structure = JSON.parse(JSON.stringify(FRONTEND_STRUCTURE)) as StructureFrontend
    }

    /**
     *
     * @param projectName project name
     * @param baseDir base dir
     */
    init(projectName: string, baseDir: string = './graphql/generated/') {
        this.projectName = projectName
        this.baseDir = baseDir

        this.structure.id = projectName.replace('../', '').replace('./', '')

        for (const str in this.structure) {
            if (str === 'id') {
                continue
            }

            const item = this.structure[str]
            item.dir = item.dir.replace('ID', this.baseDir)
        }
    }

    /**
     * create or clean directory for copy files
     */
    prepareDirectory() {
        if (!this.baseDir || !this.projectName) {
            throw new Error('this.projectName or this.baseDir are empty, call init() fist')
        }

        files.removeDirs(path.join(this.baseDir, 'src/gen'))
        files.createDirs(this.structure)
    }

    public genWrite(file: string, data: string) {
        return files.writeToFile(this.structure.gen, file, data)
    }

    write(file: string, data: string) {
        return files.writeToFile(this.structure.index, file, data)
    }

    graphqlWrite(file: string, data: string) {
        return files.writeToFile(this.structure.graphql, file, data)
    }

    //     async function replaceInFile(file, replaceFn) {
    //         return new Promise((resolve) => {
    //             fs.readFile(file, 'utf8', function (err, data) {
    //                 if (err) {
    //                     return console.log(err)
    //                 }

    //                 const result = replaceFn(data) //data.replace(/string to be replaced/g, 'replacement')

    //                 fs.writeFile(file, result, 'utf8', function (err) {
    //                     if (err) return console.log(err)
    //                     resolve(null)
    //                 })
    //             })
    //         })
    //     }
}
