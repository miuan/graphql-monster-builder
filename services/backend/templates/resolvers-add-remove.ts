export const _FUNC_LINK_NAME_ = (entry, protections) => {
    return async (root, data, ctx) => {
      
      _PROTECTION_
      if (entry.hooks && entry.hooks.resolvers['before_FUNC_LINK_NAME_']) {
       await entry.hooks.resolvers['before_FUNC_LINK_NAME_'](entry, { root, data, ctx });
      }
  
      let model = await entry.services['_LOWER_NAME_']._FUNC_LINK_NAME_(_PARAMS_);
  
      if (entry.hooks && entry.hooks.resolvers['after_FUNC_LINK_NAME_']) {
        model = await entry.hooks.resolvers['after_FUNC_LINK_NAME_'](entry, { model, root, data, ctx });
      }
  
      return model;
    };
  };

  export const _FUNC_UNLINK_NAME_ = (entry, protections) => {
    return async (root, data, ctx) => {
      
      _PROTECTION_
      _UNLINK_PROTECTION_
      
      if (entry.hooks && entry.hooks.resolvers['before_FUNC_UNLINK_NAME_']) {
       await entry.hooks.resolvers['before_FUNC_UNLINK_NAME_'](entry, { root, data, ctx });
      }
  
      let model = await entry.services['_LOWER_NAME_']._FUNC_UNLINK_NAME_(_PARAMS_);
  
      if (entry.hooks && entry.hooks.resolvers['after_FUNC_UNLINK_NAME_']) {
        model = await entry.hooks.resolvers['after_FUNC_UNLINK_NAME_'](entry, { model, root, data, ctx });
      }
  
      return model;
    };
  };