import * as extras from '../extras';

export const _MODEL_LOWER_NAME_All = (entry, protections) => {
  return async (root, data, ctx) => {
    _PROTECT_ALL_;

    if (entry.hooks && entry.hooks.resolvers['before_MODEL_NAME_All']) {
      await entry.hooks.resolvers['before_MODEL_NAME_All'](entry, { root, data, ctx });
    }

    let models = await entry.services['_MODEL_LOWER_NAME_'].all(data, ctx.userId);

    if (entry.hooks && entry.hooks.resolvers['after_MODEL_NAME_All']) {
      models = await entry.hooks.resolvers['after_MODEL_NAME_All'](entry, { models, root, data, ctx });
    }
    return models;
  };
};

export const _MODEL_LOWER_NAME_One = (entry, protections) => {
  return async (root, data, ctx) => {
    _PROTECT_ONE_;
    if (entry.hooks && entry.hooks.resolvers['before_MODEL_NAME_One']) {
      await entry.hooks.resolvers['before_MODEL_NAME_One'](entry, { root, data, ctx });
    }
    let model = await entry.services['_MODEL_LOWER_NAME_'].one(data.id);

    if (entry.hooks && entry.hooks.resolvers['after_MODEL_NAME_One']) {
      model = await entry.hooks.resolvers['after_MODEL_NAME_One'](entry, { id: data.id, model, entry, root, data, ctx });
    }

    return model;
  };
};

export const _MODEL_LOWER_NAME_Create = (entry, protections) => {
  return async (root, data, ctx) => {
    _PROTECT_CREATE_;
    if (entry.hooks && entry.hooks.resolvers['before_MODEL_NAME_Create']) {
      data = await entry.hooks.resolvers['before_MODEL_NAME_Create'](entry, { root, data, ctx });
    }

    let createdModel = await entry.services['_MODEL_LOWER_NAME_'].create(data, ctx.userId);

    if (entry.hooks && entry.hooks.resolvers['after_MODEL_NAME_Create']) {
      createdModel = await entry.hooks.resolvers['after_MODEL_NAME_Create'](entry, { root, data, ctx, createdModel });
    }

    return createdModel;
  };
};

export const _MODEL_LOWER_NAME_Update = (entry, protections) => {
  return async (root, data, ctx) => {
    _PROTECT_UPDATE_;
    if (entry.hooks && entry.hooks.resolvers['before_MODEL_NAME_Update']) {
      data = await entry.hooks.resolvers['before_MODEL_NAME_Update'](entry, { root, data, ctx });
    }

    let updatedModel = await entry.services['_MODEL_LOWER_NAME_'].update(data, null, ctx.userId);

    if (entry.hooks && entry.hooks.resolvers['after_MODEL_NAME_Update']) {
      updatedModel = await entry.hooks.resolvers['after_MODEL_NAME_Update'](entry, { root, data, ctx, updatedModel, id: data.id });
    }

    return updatedModel;
  };
};

export const _MODEL_LOWER_NAME_Remove = (entry, protections) => {
  return async (root, data, ctx) => {
    
    _PROTECT_REMOVE_;
    if (entry.hooks && entry.hooks.resolvers['before_MODEL_NAME_Remove']) {
      await entry.hooks.resolvers['before_MODEL_NAME_Remove'](entry, { root, data, ctx });
    }

    let removedModel = await entry.services['_MODEL_LOWER_NAME_'].remove(data.id, ctx.userId);

    if (entry.hooks && entry.hooks.resolvers['after_MODEL_NAME_Remove']) {
      removedModel = await entry.hooks.resolvers['after_MODEL_NAME_Remove'](entry, { removedModel, root, data, ctx });
    }

    return removedModel;
  };
};

_RESOLVERS_ADD_REMOVE_

export const generate_MODEL_NAME_Resolver = (entry) => {
  const protections = extras.generateProtections(entry, '_MODEL_LOWER_NAME_')
  return {
    all: _MODEL_LOWER_NAME_All(entry, protections),
    one: _MODEL_LOWER_NAME_One(entry, protections),
    create: _MODEL_LOWER_NAME_Create(entry, protections),
    update: _MODEL_LOWER_NAME_Update(entry, protections),
    remove: _MODEL_LOWER_NAME_Remove(entry, protections), 
    _RESOLVERS_ADD_REMOVE_CONNECT_
  };
};
