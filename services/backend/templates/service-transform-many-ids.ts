 // templates/service-transform-many-ids.ts
 // case where data._MEMBER_NAME_ have many ids or many objects
  let _LINKDED_IDS_ = [];
  if (data._PAYLOAD_NAME_FOR_ID_) {
    _LINKDED_IDS_ = data._PAYLOAD_NAME_FOR_ID_;
    data._MEMBER_NAME_ = data._PAYLOAD_NAME_FOR_ID_;
    delete data._PAYLOAD_NAME_FOR_ID_;
    
  } else if (data._PAYLOAD_NAME_FOR_CREATE_) {
    const idsOfCreated = []
    for(const createdFrom of data._PAYLOAD_NAME_FOR_CREATE_){
      _SWITCH_OF_ADD_CONNECTED_ID_createdFrom._CONNECTED_MEMBER_NAME_ = _CONNECTED_MEMBER_ID_
      const created = await entry.services['_LOWER_NAME_'].create(createdFrom);
      idsOfCreated.push(created.id);
    }
    data._MEMBER_NAME_ = idsOfCreated
    _SWITCH_OF_ADD_TO_LINKED_IDS__LINKDED_IDS_ = idsOfCreated
  }