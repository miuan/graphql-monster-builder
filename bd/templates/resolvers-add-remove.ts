export const _LOWER_NAME_AddTo_RELATION_NAME_ = (entry, protections) => {
    return async (root, data, ctx) => {
      
      _PROTECT_ALL_;
      if (entry.hooks && entry.hooks.resolvers['before_LOWER_NAME_AddTo_RELATION_NAME_']) {
       await entry.hooks.resolvers['before_LOWER_NAME_AddTo_RELATION_NAME_'](entry, { root, data, ctx });
      }
  
      let model = await entry.services['_LOWER_NAME_']._LOWER_NAME_AddTo_RELATION_NAME_(data._RELATED_PARAM_NAME_1_, data._RELATED_PARAM_NAME_2_);
  
      if (entry.hooks && entry.hooks.resolvers['after_LOWER_NAME_AddTo_RELATION_NAME_']) {
        model = await entry.hooks.resolvers['after_LOWER_NAME_AddTo_RELATION_NAME_'](entry, { model, root, data, ctx });
      }
  
      return model;
    };
  };

  export const _LOWER_NAME_RemoveFrom_RELATION_NAME_ = (entry, protections) => {
    return async (root, data, ctx) => {
      
      _PROTECT_ALL_;
      if (entry.hooks && entry.hooks.resolvers['before_LOWER_NAME_RemoveFrom_RELATION_NAME_']) {
       await entry.hooks.resolvers['before_LOWER_NAME_RemoveFrom_RELATION_NAME_'](entry, { root, data, ctx });
      }
  
      let model = await entry.services['_LOWER_NAME_']._LOWER_NAME_RemoveFrom_RELATION_NAME_(data._RELATED_PARAM_NAME_1_, data._RELATED_PARAM_NAME_2_);
  
      if (entry.hooks && entry.hooks.resolvers['after_LOWER_NAME_RemoveFrom_RELATION_NAME_']) {
        model = await entry.hooks.resolvers['after_LOWER_NAME_RemoveFrom_RELATION_NAME_'](entry, { model, root, data, ctx });
      }
  
      return model;
    };
  };