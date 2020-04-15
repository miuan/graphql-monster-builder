export const userRoleUserRoleAddToRoleOnUser = (entry, protections) => {
    return async (root, data, ctx) => {
      
      if(!await protections.role(ctx, ['admin'])
  ){
      ctx.throw(401, 'Unauhorized');
    };
      if (entry.hooks && entry.hooks.resolvers['beforeUserRoleAddToRoleOnUser']) {
        await entry.hooks.resolvers['beforeUserRoleAddToRoleOnUser'](entry, { root, data, ctx });
      }
  
      let removedModel = await entry.services['userRole'].addToRoleOnUser(data.rolesUserRoleId, data.usersUserId);
  
      if (entry.hooks && entry.hooks.resolvers['afterUserRoleAddToRoleOnUser']) {
        removedModel = await entry.hooks.resolvers['afterUserRoleAddToRoleOnUser'](entry, { removedModel, root, data, ctx });
      }
  
      return removedModel;
    };
  };