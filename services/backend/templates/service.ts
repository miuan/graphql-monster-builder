/* eslint-disable prettier/prettier */
import { VAR_NAME, Types } from '../models/_MODEL_NAME_'
import * as extras from '../extras'

export const _LOWER_NAME_All = (entry) => {
    return async (data) => {
        if (entry.hooks && entry.hooks.services['before_MODEL_NAME_All']) {
            await entry.hooks.services['before_MODEL_NAME_All'](entry, data)
        }

        const filter = extras.filterGen(data.filter)
        let findPromise = _LOWER_NAME_Model.find(filter)
        if (data.skip) findPromise = findPromise.skip(data.skip)
        if (data.limit) findPromise = findPromise.limit(data.limit)
        if (data.orderBy) {
            const {
                groups: { field, type },
            } = data.orderBy.match(/(?<field>\w+)_(?<type>(asc|desc))/)
            findPromise = findPromise.sort([[field, type]])
        }

        let models = await findPromise.lean()

        if (entry.hooks && entry.hooks.services['after_MODEL_NAME_All']) {
            models = await entry.hooks.services['after_MODEL_NAME_All'](entry, { models, ...data })
        }
        return models
    }
}

export const _LOWER_NAME_Count = (entry) => {
    return async (data) => {
        if (entry.hooks && entry.hooks.services['before_MODEL_NAME_Count']) {
            await entry.hooks.services['before_MODEL_NAME_Count'](entry, data)
        }

        const filter = extras.filterGen(data.filter)
        let countPromise = _LOWER_NAME_Model.count(filter)

        let count = await countPromise.lean()

        if (entry.hooks && entry.hooks.services['after_MODEL_NAME_Count']) {
            count = await entry.hooks.services['after_MODEL_NAME_Count'](entry, { count, ...data })
        }
        return count
    }
}

export const _LOWER_NAME_One = (entry) => {
    return async (id, userId = null) => {
        if (entry.hooks && entry.hooks.services['before_MODEL_NAME_One']) {
            await entry.hooks.services['before_MODEL_NAME_One'](entry, { id })
        }
        let model = await _LOWER_NAME_Model.findById(id).lean()
        model.id = id

        if (entry.hooks && entry.hooks.services['after_MODEL_NAME_One']) {
            model = await entry.hooks.services['after_MODEL_NAME_One'](entry, { id, model })
        }

        return model
    }
}

export const _LOWER_NAME_Create = (entry) => {
    return async (data, ctxUserId = null) => {
        // before real object exist
        // we generate TEMPORARY-ID for related objects what they have a required relation...
        const id = Types.ObjectId()

        _ALL_IDS_CONVERSIONS_CREATE_
        if (entry.hooks && entry.hooks.services['before_MODEL_NAME_Create']) {
            data = await entry.hooks.services['before_MODEL_NAME_Create'](entry, { data, ctxUserId })
        }
        _EXTRA_ACTION_BEFORE_CREATE_
        let createdModel = await VAR_NAME.create(data)

        _EXTRA_ACTION_AFTER_CREATE_
        _CONNECT_RELATION_CREATE_
        if (entry.hooks && entry.hooks.services['after_MODEL_NAME_Create']) {
            createdModel = await entry.hooks.services['after_MODEL_NAME_Create'](entry, {
                id: createdModel._id,
                data: createdModel,
                ctxUserId,
            })
        }
        return createdModel
    }
}

export const _LOWER_NAME_Update = (entry) => {
    return async (data, update_LOWER_NAME_Id = null, ctxUserId = null) => {
        let id = update_LOWER_NAME_Id

        if (data.id) {
            id = data.id
            delete data.id
        }

        if (entry.hooks && entry.hooks.services['before_MODEL_NAME_Update']) {
            data = await entry.hooks.services['before_MODEL_NAME_Update'](entry, { data, id, ctxUserId })
        }

        // disconnect all relations
        _DISCONNECT_RELATIONS_
        _ALL_IDS_CONVERSIONS_UPDATE_
        _EXTRA_ACTION_BEFORE_UPDATE_
        let updatedModel = await VAR_NAME.findByIdAndUpdate(id, data, { new: true, runValidators: true })

        // connect all relations
        _CONNECT_RELATION_UPDATE_

        if (entry.hooks && entry.hooks.services['after_MODEL_NAME_Update']) {
            updatedModel = await entry.hooks.services['after_MODEL_NAME_Update'](entry, {
                data: updatedModel,
                id,
                ctxUserId,
            })
        }

        return updatedModel
    }
}

export const _LOWER_NAME_Remove = (entry, ctxUserId = null) => {
    return async (id, userId, skipRelations = []) => {
        if (entry.hooks && entry.hooks.services['before_MODEL_NAME_Remove']) {
            await entry.hooks.services['before_MODEL_NAME_Remove'](entry, { id, ctxUserId })
        }

        // disconnect all relations
        _DISCONNECT_RELATIONS_IN_REMOVE
        _EXTRA_ACTION_BEFORE_REMOVE_
        let removedModel = await VAR_NAME.findByIdAndRemove(id)

        if (entry.hooks && entry.hooks.services['after_MODEL_NAME_Remove']) {
            removedModel = await entry.hooks.services['after_MODEL_NAME_Remove'](entry, {
                data: removedModel,
                id,
                ctxUserId,
            })
        }

        return removedModel
    }
}

_SERVICE_ADD_REMOVE_

export const generate_MODEL_NAME_Service = (entry) => {
    return {
        all: _LOWER_NAME_All(entry),
        count: _LOWER_NAME_Count(entry),
        one: _LOWER_NAME_One(entry),
        create: _LOWER_NAME_Create(entry),
        update: _LOWER_NAME_Update(entry),
        remove: _LOWER_NAME_Remove(entry),
        _SERVICE_ADD_REMOVE_CONNECT_
    }
}
