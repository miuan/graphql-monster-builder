import { rejects } from 'assert'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as send from 'koa-send'
import * as path from 'path'
import { resolve } from 'path'

const PUBLIC_TOKEN_SIZE = 64

export function registerStorageService(fileModel, targetDir: any): any {
    return {
        saveDataToFile: async (id, fileData) => {
            if (id) {
                const existFile = await fileModel.findById(id).select({ __path: 1 }).lean()
                fileData.__path = existFile.__path
            }

            if (!fileData.__path) {
                fileData.publicKey = await generateUniqFilePublicKey(fileModel)
                fileData.__path = path.join(targetDir, fileData.publicKey)
            }

            await new Promise((resolve, reject) =>
                fs.writeFile(fileData.__path, fileData.data, (err) => {
                    if (err) return reject(err)
                    fs.stat(fileData.__path, (err2, stat) => {
                        if (err2) return reject(err2)
                        fileData.size = stat.size
                        resolve(true)
                    })
                }),
            )
        },
        loadDataFromFile: async (fileData, data, koaContext) => {
            const fullPath = path.resolve(fileData.__path)

            return await new Promise((resolve, reject) =>
                fs.stat(fullPath, (err, exists) => {
                    if (!exists) return reject(`System error file with key: '${fileData.publicKey}' doesn't exist`)

                    fs.readFile(fullPath, (err, data) => (err ? reject(err) : resolve(data.toString())))
                }),
            )
        },
        unlinkFile: async (id) => {
            const existFile = await fileModel.findById(id).select({ __path: 1 }).lean()
            const filePath = existFile.__path

            return await new Promise((resolve, reject) => fs.unlink(filePath, (err) => (err ? reject(err) : resolve(true))))
        },
    }
}

export function registerStorageRouter(entry: any, router: any, targetDir: any) {
    const fileService = entry.services['file']
    const fileModel = entry.models['file']
    const userModel = entry.models['user']
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
            state: { user },
            originalUrl,
        } = ctx

        if (!user?.id) {
            ctx.throw(401, 'Unauthorized')
        }

        const userExists = await userModel.exists({_id: user.id})
        if (!userExists) {
            ctx.throw(401, 'Unauthorized: unknown user')
        }

        for (const uploadingFile of uploadingFiles) {
            const { path: tempFileLocation, name, type, size } = ctx.request.files[uploadingFile]
            const publicKey = await generateUniqFilePublicKey(fileModel)
            const __path = path.join(targetDir, publicKey)

            await new Promise((resolve, reject) =>
                fs.rename(tempFileLocation, __path, async (err) => {
                    if (err) reject(err)
                    resolve(__path)
                }),
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
            file = await fileModel.findOne({ publicKey: id }).lean()
        }

        if (!file) {
            throw new Error('File not found')
        }

        ctx.set('Content-disposition', 'attachment; filename=' + file.name)
        ctx.set('Content-type', file.type)
        await send(ctx, file.__path)
    })
}

export async function generateUniqFilePublicKey(fileModel) {
    let publicKey: string

    do {
        publicKey = crypto.randomBytes(PUBLIC_TOKEN_SIZE).toString('hex')
    } while (await fileModel.exists({ publicKey }))

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
