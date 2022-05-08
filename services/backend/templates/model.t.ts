import { Schema, Model, Types, model } from 'mongoose'
import { __MODEL_NAME__Model } from '../model-types'
export { Types } from 'mongoose'
__CONSTRUCTED_IMPORTS__

export const __SCHEMA_NAME__: Schema = new Schema(
    {
        __CONSTRUCTED_MEMBERS__
    },
    {
        timestamps: true,
        usePushEach: true,
        versionKey: false,
    },
)

__CONSTRUCTED_INDEXIES__

__SCHEMA_NAME__.set('toJSON', {
    transform: function (doc, ret) {
        ret.id = ret._id
        delete ret._id

        // remove hidden fields __
        for (const key in ret) {
            if (key.startsWith('__')) {
                delete ret[key]
            }
        }
    },
})

__EXPORT_MODEL__
