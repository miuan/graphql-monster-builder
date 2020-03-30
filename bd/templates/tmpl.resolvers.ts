import * as extras from '../extras';

export const _MODEL_LOWER_NAME_All = (entry) => {
  return async (root, data, ctx) => {
    const protections = extras.generateProtection(entry, ctx, data);
    _PROTECT_ALL_;

    if (entry.hooks && entry.hooks.resolvers['before_MODEL_NAME_All']) {
      await entry.hooks.resolvers['before_MODEL_NAME_All'](entry, { root, data, ctx });
    }

    let models = await entry.services['_MODEL_LOWER_NAME_'].all(data.limit, data.offset, data.sort, ctx.userId);

    if (entry.hooks && entry.hooks.resolvers['after_MODEL_NAME_All']) {
      models = await entry.hooks.resolvers['after_MODEL_NAME_All'](entry, { models, root, data, ctx });
    }
    return models;
  };
};

export const _MODEL_LOWER_NAME_One = (entry) => {
  return async (root, data, ctx) => {
    const protections = extras.generateProtection(entry, ctx, data);
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

export const _MODEL_LOWER_NAME_Create = (entry) => {
  return async (root, data, ctx) => {
    const protections = extras.generateProtection(entry, ctx, data);
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

export const _MODEL_LOWER_NAME_Update = (entry) => {
  return async (root, data, ctx) => {
    const protections = extras.generateProtection(entry, ctx, data);
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

export const _MODEL_LOWER_NAME_Remove = (entry) => {
  return async ({ root, data, ctx }) => {
    const protections = extras.generateProtection(entry, ctx, data);
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



export const generate_MODEL_NAME_Resolver = (entry) => {
  return {
    all: _MODEL_LOWER_NAME_All(entry),
    one: _MODEL_LOWER_NAME_One(entry),
    create: _MODEL_LOWER_NAME_Create(entry),
    update: _MODEL_LOWER_NAME_Update(entry),
    remove: _MODEL_LOWER_NAME_Remove(entry), 
  };
};
