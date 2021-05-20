import { VAR_NAME } from '../models/_MODEL_NAME_';
import * as extras from '../extras';
  
export const _LOWER_NAME_All = (entry) => {
  return async (data) => {
    if (entry.hooks && entry.hooks.services['before_MODEL_NAME_All']) {
      await entry.hooks.services['before_MODEL_NAME_All'](entry, data);
    }

    const filter = extras.filterGen(data.filter)
    console.log('\nfilterGen(filter)\n', filter)
    let models = await _LOWER_NAME_Model.find(filter);
    
    if (entry.hooks && entry.hooks.services['after_MODEL_NAME_All']) {
      models = await entry.hooks.services['after_MODEL_NAME_All'](entry, { models, ...data });
    }
    return models;
  };
};

export const _LOWER_NAME_One = (entry) => {
  return async (id, userId = null) => {
    if (entry.hooks && entry.hooks.services['before_MODEL_NAME_One']) {
      await entry.hooks.services['before_MODEL_NAME_One'](entry, { id });
    }
    let model = await _LOWER_NAME_Model.findById(id);

    if (entry.hooks && entry.hooks.services['after_MODEL_NAME_One']) {
      model = await entry.hooks.services['after_MODEL_NAME_One'](entry, { id, model });
    }

    return model;
  };
};

export const _LOWER_NAME_Create = (entry) => {
  return async (data) => {

    _ALL_IDS_CONVERSIONS_;

    if (entry.hooks && entry.hooks.services['before_MODEL_NAME_Create']) {
      data = await entry.hooks.services['before_MODEL_NAME_Create'](entry, { data });
    }

    _EXTRA_ACTION_BEFORE_CREATE_;

    let createdModel = await VAR_NAME.create(data);

    _EXTRA_ACTION_AFTER_CREATE_;
    
    _CONNECT_RELATION_CREATE_;

    if (entry.hooks && entry.hooks.services['after_MODEL_NAME_Create']) {
      createdModel = await entry.hooks.services['after_MODEL_NAME_Create'](entry, { createdModel });
    }

    return createdModel;
  };
};

export const _LOWER_NAME_Update = (entry) => {
  return async (data, _LOWER_NAME_Id = null, user = null) => {
    let id = _LOWER_NAME_Id;
    
    if (data.id) {
      id = data.id;
      delete data.id;
    }

    _ALL_IDS_CONVERSIONS_;

    if (entry.hooks && entry.hooks.services['before_MODEL_NAME_Update']) {
      data = await entry.hooks.services['before_MODEL_NAME_Update'](entry, { data, id });
    }

    _EXTRA_ACTION_BEFORE_UPDATE_;

    let updatedModel = await VAR_NAME.findByIdAndUpdate(id, data, { new: true });
    // disconnect all relations
    _DISCONNECT_RELATIONS_;
    // connect all relations
    _CONNECT_RELATION_UPDATE_;

    if (entry.hooks && entry.hooks.services['after_MODEL_NAME_Update']) {
      updatedModel = await entry.hooks.services['after_MODEL_NAME_Update'](entry, { updatedModel, id });
    }

    return updatedModel;
  };
};

export const _LOWER_NAME_Remove = (entry, skipRelations=[]) => {
  return async (id, userId = null) => {
    if (entry.hooks && entry.hooks.services['before_MODEL_NAME_Remove']) {
      await entry.hooks.services['before_MODEL_NAME_Remove'](entry, { id });
    }

    let removedModel = await VAR_NAME.findByIdAndRemove(id);

    if (entry.hooks && entry.hooks.services['after_MODEL_NAME_Remove']) {
      removedModel = await entry.hooks.services['after_MODEL_NAME_Remove'](entry, { removedModel, id, userId });
    }

    return removedModel;
  };
};

_SERVICE_ADD_REMOVE_

export const generate_MODEL_NAME_Service = (entry) => {
  return {
    all: _LOWER_NAME_All(entry),
    one: _LOWER_NAME_One(entry),
    create: _LOWER_NAME_Create(entry),
    update: _LOWER_NAME_Update(entry),
    remove: _LOWER_NAME_Remove(entry),
    _SERVICE_ADD_REMOVE_CONNECT_
  };
};
