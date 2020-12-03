import { defaultMaxListeners } from "stream";
import { BackendDirectory } from "./backendDirectory";
import * as files from '../common/files'
import 'jest-extended'

describe('StructureOperator', () => {
    let writeToFileMock
    let removeDirsMock
    let createDirsMock

    beforeAll(()=>{
        writeToFileMock = jest.spyOn(files, 'writeToFile').mockImplementation(()=>(true))
        removeDirsMock = jest.spyOn(files, 'removeDirs').mockImplementation(()=>(true))
        createDirsMock = jest.spyOn(files, 'createDirs').mockImplementation(()=>(true))
    })

    afterEach(()=>{
        writeToFileMock.mockClear()
        removeDirsMock.mockClear()
        createDirsMock.mockClear()
    })

    afterAll(()=>{
        (<any>files.writeToFile).mockRestore()
        (<any>files.removeDirs).mockRestore()
        (<any>files.createDirs).mockRestore()
    })

    it('should after init all structured item startsWith ../praha3/mainProject', () => {
        const structureOperator = new BackendDirectory()
        structureOperator.init('mainProject', '../praha3')

        for (const str in structureOperator.structure) {
            if (str === 'id') {
                continue;
            }

            expect(structureOperator.structure[str].dir).toMatch(/^..\/praha3\/mainProject/)
        }

        expect(structureOperator.projectName).toEqual('mainProject')
        expect(structureOperator.baseDir).toEqual('../praha3')
    })

    it('should call removeDirs and createDirs in prepareDirectory', () => {
        const structureOperator = new BackendDirectory()
        structureOperator.init('mainProject2', '../praha4')
        structureOperator.prepareDirectory()

        expect(removeDirsMock).toBeCalledTimes(1)
        expect(removeDirsMock).toBeCalledWith('../praha4/mainProject2/gen')
        expect(createDirsMock).toBeCalledTimes(1)
        expect(createDirsMock).toBeCalledWith(structureOperator.structure)
        expect(createDirsMock).toHaveBeenCalledAfter(removeDirsMock)
    })

    it('should throw when is not initialized and call prepareDirectory', () => {
        const structureOperator = new BackendDirectory()
        expect(()=>structureOperator.prepareDirectory()).toThrow(/init\(\)/)
    })

    it.each([
        ['write', 'schema', 'file1', 'data1'],
        ['genWrite', 'gen', 'file2', 'data2'],
        ['modelsWrite', 'models', 'file3', 'data3'],
        ['resolversWrite', 'resolvers', 'file4', 'data4'],
        ['servicesWrite', 'services', 'file5', 'data5']
    ])('should call writeToFile inside \`%s\` with right parameters', (funcName:string, structureItemName, fileName: string, data: string)=>{
        
        const structureOperator = new BackendDirectory()

        structureOperator[funcName](fileName, data)
        expect(writeToFileMock).toBeCalledTimes(1)
        expect(writeToFileMock).toBeCalledWith(structureOperator.structure[structureItemName], fileName, data)
    })
    
})