// template/service-add-remove.ts
export const _FUNC_LINK_NAME_ = (entry) => {
    // console.log('_LOWER_NAME_AddTo_RELATION_NAME_')
    return async (_RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_) => {
      if (entry.hooks && entry.hooks.services['before_FUNC_LINK_NAME_']) {
        await entry.hooks.services['before_FUNC_LINK_NAME_'](entry, { _RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_ });
      }
  
      const [_LOWER_NAME_UpdateStats, _RELATED_MODEL_NAME_UpdateStats] = await Promise.all([
        entry.models['_LOWER_NAME_'].updateOne({
          _id: _RELATED_PARAM_NAME_1_,
          _MEMBER_NAME_: {$ne: _RELATED_PARAM_NAME_2_}
        }, {
          $push: {_MEMBER_NAME_: { $each: [_RELATED_PARAM_NAME_2_]}}
        }),
        entry.models['_LOWER_RELATED_MODEL_NAME_'].updateOne({
          _id: _RELATED_PARAM_NAME_2_,
          _RELATED_MEMBER_NAME_: { "$ne": _RELATED_PARAM_NAME_1_ } 
        }, {
          $push: {_RELATED_MEMBER_NAME_: { $each: [_RELATED_PARAM_NAME_1_]}}
        })
      ])

      //const _LOWER_NAME_Related = await entry.models['_LOWER_NAME_'].findById(_RELATED_PARAM_NAME_1_).lean()
      //const _RELATED_MODEL_NAME_Related = await entry.models['_LOWER_RELATED_MODEL_NAME_'].findById(_RELATED_PARAM_NAME_2_).lean()
  
      if (entry.hooks && entry.hooks.services['after_FUNC_LINK_NAME_']) {
        await entry.hooks.services['after_FUNC_LINK_NAME_'](entry, { 
          //_LOWER_NAME_Related, 
          _LOWER_NAME_UpdateStats,
          //_RELATED_MODEL_NAME_Related,
          _RELATED_MODEL_NAME_UpdateStats, 
          _RELATED_PARAM_NAME_1_, 
          _RELATED_PARAM_NAME_2_ });
      }
  
      return {
        //_PAYLOAD_PARAM_1: _LOWER_NAME_Related,
        //_PAYLOAD_PARAM_2:  _RELATED_MODEL_NAME_Related
        _RELATED_PARAM_NAME_1_, 
        _RELATED_PARAM_NAME_2_,
        _PAYLOAD_PARAM_1_ModifiedCount: _LOWER_NAME_UpdateStats.nModified,
        _PAYLOAD_PARAM_2_ModifiedCount: _LOWER_NAME_UpdateStats.nModified
      };
    };
  };


  export const _FUNC_UNLINK_NAME_ = (entry) => {
    // console.log('_LOWER_NAME_RemoveFrom_RELATION_NAME_')
    return async (_RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_) => {
      if (entry.hooks && entry.hooks.services['before_FUNC_UNLINK_NAME_']) {
        await entry.hooks.services['before_FUNC_UNLINK_NAME_'](entry, { _RELATED_PARAM_NAME_1_, _RELATED_PARAM_NAME_2_ });
      }
  
      const [_LOWER_NAME_UpdateStats, _RELATED_MODEL_NAME_UpdateStats] = await Promise.all([
        entry.models['_LOWER_NAME_'].updateOne({
          _id: _RELATED_PARAM_NAME_1_,
          _MEMBER_NAME_: _RELATED_PARAM_NAME_2_
        }, {
          $pull: {_MEMBER_NAME_: _RELATED_PARAM_NAME_2_}
        }),
        entry.models['_LOWER_RELATED_MODEL_NAME_'].updateOne({
          _id: _RELATED_PARAM_NAME_2_,
          _RELATED_MEMBER_NAME_: _RELATED_PARAM_NAME_1_ 
        }, {
          $pull: {_RELATED_MEMBER_NAME_: _RELATED_PARAM_NAME_1_}
        })
      ])

      // const _LOWER_NAME_Related = await entry.models['_LOWER_NAME_'].findById(_RELATED_PARAM_NAME_1_)
      // const _RELATED_MODEL_NAME_Related = await entry.models['_LOWER_RELATED_MODEL_NAME_'].findById(_RELATED_PARAM_NAME_2_)
  
      if (entry.hooks && entry.hooks.services['after_FUNC_UNLINK_NAME_']) {
        await entry.hooks.services['after_FUNC_UNLINK_NAME_'](entry, { 
          //_LOWER_NAME_Related,
          _LOWER_NAME_UpdateStats, 
          //_RELATED_MODEL_NAME_Related, 
          _RELATED_MODEL_NAME_UpdateStats,
          _RELATED_PARAM_NAME_1_, 
          _RELATED_PARAM_NAME_2_ });
      }
  
      return {
        _RELATED_PARAM_NAME_1_, 
        _RELATED_PARAM_NAME_2_,
        _PAYLOAD_PARAM_1_ModifiedCount: _LOWER_NAME_UpdateStats.nModified,
        _PAYLOAD_PARAM_2_ModifiedCount: _LOWER_NAME_UpdateStats.nModified
        // _PAYLOAD_PARAM_1: _LOWER_NAME_Related,
        // _PAYLOAD_PARAM_2:  _RELATED_MODEL_NAME_Related
      };
    };
  };