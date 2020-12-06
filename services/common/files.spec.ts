import * as fs from 'fs'
import {writeToFile} from './files'
import { StructureItem } from './types'

describe('files', () => {
    let existsSyncMock
    let writeFileSyncMock

    beforeAll(()=>{
        existsSyncMock = jest.spyOn(fs, 'existsSync').mockImplementationOnce(()=>(false)).mockImplementationOnce(()=>(true)).mockImplementation(()=>(false))
        writeFileSyncMock = jest.spyOn(fs, 'writeFileSync').mockImplementation(()=>(true))
    })

    beforeEach(()=>{
        existsSyncMock.mockClear()
        writeFileSyncMock.mockClear()
    })

    afterAll(()=>{
        (<any>fs.existsSync).mockRestore()
        (<any>fs.writeFileSync).mockRestore()
    })

    it('should call writeFileSync in writeToFile on when the file doesn\'t exists', () => {
        const sctructureItem = {
            dir: '_t1_',
            modules: []
        } as StructureItem

        writeToFile(sctructureItem, 'testFileForWrite', 'data')

        expect(existsSyncMock).toBeCalledTimes(1)
        expect(existsSyncMock).toBeCalledWith('_t1_/testFileForWrite.ts')
        expect(writeFileSyncMock).toBeCalledTimes(1)
        expect(writeFileSyncMock).toBeCalledWith('_t1_/testFileForWrite.ts', 'data')

        // second call of existsSyncMock return true
        // so writeFileSyncMock should not be called
        writeToFile(sctructureItem, 'testFileForWrite2', 'data2')
        expect(existsSyncMock).toBeCalledTimes(2)
        expect(existsSyncMock).toBeCalledWith('_t1_/testFileForWrite2.ts')
        expect(writeFileSyncMock).toBeCalledTimes(1)
    })
})