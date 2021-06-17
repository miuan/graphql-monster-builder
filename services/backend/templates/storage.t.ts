import { rejects } from 'assert'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as send from 'koa' // 'koa-send'
import * as path from 'path'
import { resolve } from 'path'

const PUBLIC_TOKEN_SIZE = 64

export function registerStorageService(targetDir: any): any {
    return {
        saveDataToFile: async (fileModel, fileData) => {
            if (!fileData.__fullPath) {
                fileData.publicKey = await generateUniqFilePublicKey(fileModel)
                fileData.__path = path.join(targetDir, fileData.publicKey)
            }
            fileData.size = fileData.data.length

            await new Promise((resolve, reject) => fs.writeFile(fileData.__path, fileData.data, (err) => {
                if (err)
                    return reject(err)
                resolve(true)
            }))
        },
        loadDataFromFile: async (fileModel, data, koaContext) => {
            const fullPath = path.resolve(fileModel.__path)

            return await new Promise((resolve, reject) => fs.stat(fullPath, (err, exists) => {
                if (!exists)
                    return reject(`System error file with key: '${fileModel.publicKey}' doesn't exist`)

                fs.readFile(fullPath, (err, data) => err ? reject(err) : resolve(data.toString()))
            }))
        },
    }
}

export function registerStorageRouter(entry: any, router: any, targetDir: any) {
    const fileService = entry.services['file']
    const fileModel = entry.models['file']
    // const targetDir = `./__clients__/${clientId}/${projectId}/upload`
    // if (!fs.existsSync(targetDir)) {
    //     fs.mkdirSync(targetDir, { recursive: true })
    // }
    router.post('/upload', async (ctx) => {
        const uploadingFiles = ctx.request.files && Object.keys(ctx.request.files)
        if (!uploadingFiles || uploadingFiles.length < 1) {
            ctx.throw(400, 'Upload expect multipart form with file')
        }

        const {
            state: { user }, originalUrl,
        } = ctx

        if (!user?.id) {
            ctx.throw(401, 'Unauthorized')
        }

        for (const uploadingFile of uploadingFiles) {
            const { path: tempFileLocation, name, type, size } = ctx.request.files[uploadingFile]
            const publicKey = await generateUniqFilePublicKey(fileModel)
            const __path = path.join(targetDir, publicKey) 

            await new Promise((resolve, reject) => fs.rename(tempFileLocation, __path, async (err) => {
                if (err)
                    reject(err)
                resolve(__path)
            })
            )

            const file = await fileService.create({
                name,
                type,
                size,
                __path,
                publicKey,
                userId: user.id,
            })

            ctx.body = {
                id: file._id,
                publicKey,
                name,
                type,
                size,
            }
        }
    })

    router.get('/download/:id', async (ctx) => {
        const { id } = ctx.params

        let file
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            // access with id is possible only authorized users
            if (!ctx.state?.user?.id) {
                ctx.throw(401, 'Unauthorized')
            }

            file = await fileModel.findById(id).lean()
        } else {
            file = await fileModel.findOne({ publicToken: id }).lean()
        }

        ctx.set('Content-disposition', 'attachment; filename=' + file.name)
        ctx.set('Content-type', file.type)
    })
}

export async function generateUniqFilePublicKey(fileModel) {
    let publicKey: string

    do {
        publicKey = crypto.randomBytes(PUBLIC_TOKEN_SIZE).toString('hex')
    } while (await fileModel.exists({publicKey}))

    return publicKey
}

export function generateUniqFileName(targetDir: string) {
    let base: string, fullPath: string

    do {
        base = crypto.randomBytes(PUBLIC_TOKEN_SIZE).toString('hex')
        fullPath = path.join(targetDir, base)
    } while (fs.existsSync(fullPath))

    return [fullPath, base]
}
