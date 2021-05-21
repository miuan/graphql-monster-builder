 // templates/service-transform-many-ids.ts
 // case where data._MEMBER_NAME_ have many ids or many objects
 const _LINKDED_IDS_ = [];
 if (data._MEMBER_NAME_Ids) {
   data._MEMBER_NAME_ = data._MEMBER_NAME_Ids;
   delete data._MEMBER_NAME_Ids;
   _LINKDED_IDS_.push(...data._MEMBER_NAME_);
 } else if (data._MEMBER_NAME_s) {
    const idsOfCreated = []
    for(const createdFrom of data._MEMBER_NAME_s){
     createdFrom._CONNECTED_MEMBER_NAME_ = _CONNECTED_MEMBER_ID_
     const created = await entry.services['_LOWER_NAME_'].create(createdFrom);
     idsOfCreated.push(created.id);
   }
 }