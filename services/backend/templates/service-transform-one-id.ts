  // templates/service-transform-one-id.ts
  // case where data._MEMBER_NAME_ have multiple ids or multiple object
  if (data._PAYLOAD_NAME_FOR_ID_) {
    _LINKDED_IDS_.push(data._PAYLOAD_NAME_FOR_ID_);
    data._MEMBER_NAME_ = data._PAYLOAD_NAME_FOR_ID_
  } 
