 // templates/service-transform-many-ids.ts
 // case where data._MEMBER_NAME_ have many ids or many objects
  let _LINKDED_IDS_ = [];

  if (data._PAYLOAD_NAME_FOR_CREATE_) {
    const idsOfCreated = []
    for(const createdFrom of data._PAYLOAD_NAME_FOR_CREATE_){
      _SWITCH_OF_ADD_CONNECTED_ID_createdFrom._CONNECTED_MEMBER_NAME_ = _CONNECTED_MEMBER_ID_
      const created = await entry.services['_LOWER_NAME_'].create(createdFrom);
      idsOfCreated.push(created.id)
      _SWITCH_OF_ADD_TO_LINKED_IDS__LINKDED_IDS_.push(created.id)
    }
    data._MEMBER_NAME_ = idsOfCreated
  }

  if (data._PAYLOAD_NAME_FOR_ID_) {
    if(data._MEMBER_NAME_ && data._MEMBER_NAME_.length > 0) data._MEMBER_NAME_.push(...data._PAYLOAD_NAME_FOR_ID_)
    else data._MEMBER_NAME_ = data._PAYLOAD_NAME_FOR_ID_
    _LINKDED_IDS_.push(...data._PAYLOAD_NAME_FOR_ID_)
  }
  