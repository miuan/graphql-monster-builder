import { generateDataloaders } from './dataloaders';
import * as extras from './extras';

let hooks;

try {
  hooks = require('../../custom/${structure.id}/hooks.ts').hooks
} catch( ex ) {
  hooks = {}
  console.log('missing custom/${structure.id}/hooks.ts');
}

export const generateResolver = (setting = {}) => {
  const entry = {
    models:{},
    services:{},
    resolvers:{},
    dataloaders:{},
    hooks:{
      services: {},
      resolvers: {}
    },
  };

  if( hooks.services ){
    for( const serviceHookName in hooks.services ) {
      console.log('Register ' + serviceHookName + ' for service');
      entry.hooks.services[serviceHookName] = hooks.services[serviceHookName];
    }
  }
  

  if( hooks.resolvers ){
    for( const serviceHookName in hooks.resolvers ) {
      console.log('Register ' + serviceHookName + ' for resolver');
      entry.hooks.resolvers[serviceHookName] = hooks.resolvers[serviceHookName];
    }
  }
  

 _MODELS_BODY_
_SERVICES_
_RE1SOLVERS_
  
  generateDataloaders(entry);

  const resolver = _RESOLVER_

  return {
    entry,
    resolver,
  };
};