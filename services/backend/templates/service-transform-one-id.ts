  // templates/service-transform-one-id.ts
  // case where data._MEMBER_NAME_ have multiple ids or multiple object
 const _LINKDED_IDS_ = [];
 if (data._MEMBER_NAME_Id) {
   data._MEMBER_NAME_ = data._MEMBER_NAME_Id;
   delete data._MEMBER_NAME_Id;
   _LINKDED_IDS_.push(data._MEMBER_NAME_);
 } else if (data._MEMBER_NAME_) {
    data._MEMBER_NAME_._CONNECTED_MEMBER_NAME_ = _CONNECTED_MEMBER_ID_
    const created = await entry.services['_LOWER_NAME_'].create(data._MEMBER_NAME_);
    data._MEMBER_NAME_ = created.id;
 }