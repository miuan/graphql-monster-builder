
export const _LOWER_NAME_AddTo_RELATION_NAME_ = (entry) => {
    console.log('_LOWER_NAME_AddTo_RELATION_NAME_')
    return async (_RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_) => {
      if (entry.hooks && entry.hooks.services['before_LOWER_NAME_AddTo_RELATION_NAME_']) {
        await entry.hooks.services['before_LOWER_NAME_AddTo_RELATION_NAME_'](entry, { _RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_ });
      }
  
      let _LOWER_NAME_Related = await entry.models['_LOWER_NAME_'].update({
        _id: _RELATED_PARAM_NAME_1_,
        _MEMBER_NAME_: {$ne: _RELATED_PARAM_NAME_2_}
      }, {
        $push: {_MEMBER_NAME_: { $each: [_RELATED_PARAM_NAME_2_]}}
      })
  
      const _RELATED_MODEL_NAME_Related = await entry.models['_RELATED_MODEL_NAME_'].update({
        _id: _RELATED_PARAM_NAME_2_,
        _RELATED_MEMBER_NAME_: { "$ne": _RELATED_PARAM_NAME_1_ } 
      }, {
        $push: {_RELATED_MEMBER_NAME_: { $each: [_RELATED_PARAM_NAME_1_]}}
      })
  
      if (entry.hooks && entry.hooks.services['after_LOWER_NAME_AddTo_RELATION_NAME_']) {
        await entry.hooks.services['after_LOWER_NAME_AddTo_RELATION_NAME_'](entry, { _LOWER_NAME_Related, _RELATED_MODEL_NAME_Related, _RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_ });
      }
  
      return {
        _PAYLOAD_PARAM_1: _LOWER_NAME_Related,
        _PAYLOAD_PARAM_2:  _RELATED_MODEL_NAME_Related
      };
    };
  };


  export const _LOWER_NAME_RemoveFrom_RELATION_NAME_ = (entry) => {
    console.log('_LOWER_NAME_RemoveFrom_RELATION_NAME_')
    return async (_RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_) => {
      if (entry.hooks && entry.hooks.services['before_LOWER_NAME_RemoveFrom_RELATION_NAME_']) {
        await entry.hooks.services['before_LOWER_NAME_RemoveFrom_RELATION_NAME_'](entry, { _RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_ });
      }
  
      let _LOWER_NAME_Related = await entry.models['_LOWER_NAME_'].update({
        _id: _RELATED_PARAM_NAME_1_,
        // _MEMBER_NAME_: {$ne: _RELATED_PARAM_NAME_2_}
      }, {
        $pull: {_MEMBER_NAME_: { $each: [_RELATED_PARAM_NAME_2_]}}
      })
  
      const _RELATED_MODEL_NAME_Related = await entry.models['_RELATED_MODEL_NAME_'].update({
        _id: _RELATED_PARAM_NAME_2_,
        // _RELATED_MEMBER_NAME_: { "$ne": _RELATED_PARAM_NAME_1_ } 
      }, {
        $pull: {_RELATED_MEMBER_NAME_: { $each: [_RELATED_PARAM_NAME_1_]}}
      })
  
      if (entry.hooks && entry.hooks.services['after_LOWER_NAME_RemoveFrom_RELATION_NAME_']) {
        await entry.hooks.services['after_LOWER_NAME_RemoveFrom_RELATION_NAME_'](entry, { _LOWER_NAME_Related, _RELATED_MODEL_NAME_Related, _RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_ });
      }
  
      return {
        _PAYLOAD_PARAM_1: _LOWER_NAME_Related,
        _PAYLOAD_PARAM_2:  _RELATED_MODEL_NAME_Related
      };
    };
  };