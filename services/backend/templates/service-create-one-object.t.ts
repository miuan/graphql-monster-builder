  // templates/service-crete-one-object.t.ts
  // case where data._MEMBER_NAME_ have multiple ids or multiple object
  if (data._PAYLOAD_NAME_FOR_CREATE_) {
    if(data._PAYLOAD_NAME_FOR_ID_) throw new Error('`_PAYLOAD_NAME_FOR_CREATE_` and `_PAYLOAD_NAME_FOR_ID_` can\'t be filled together')
    _SWITCH_OF_ADD_CONNECTED_ID_data._MEMBER_NAME_._CONNECTED_MEMBER_NAME_ = _CONNECTED_MEMBER_ID_
    const created = await entry.services['_LOWER_NAME_'].create(data._PAYLOAD_NAME_FOR_CREATE_)
    data._MEMBER_NAME_ = created.id
    _SWITCH_OF_ADD_TO_LINKED_IDS__LINKDED_IDS_.push(created.id)
  } 