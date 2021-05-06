import { writeToFile } from '../../services/common/files';
import { StructureBackend, SchemaModel } from '../../services/common/types';

import logger from '../../services/log'
import { BackendDirectory } from '../backendDirectory';
const log = logger.getLogger('dataloaders')

export const generateDataloaders = async (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
  log.info('generate Dataloaders for all models')
  const body = generateDataloadersWorker(models);
  backendDirectory.genWrite( `dataloaders`, body);
};

export const generateDataloadersWorker = (models: SchemaModel[]):string => {
  let body = `
  import * as DataLoader from 'dataloader';
 
  interface IServiceDataloader {
    find(filter);
    count(param);
  }

  interface IMyDataloader extends DataLoader<{}, {}>{
    dataloader: any;
    service: IServiceDataloader;
  }
  
  const createDataloder = (service: IServiceDataloader) => {
    const params = { cacheKeyFn: key => key.toString() };
    const dataloader: IMyDataloader = new DataLoader(keys => batchFind(service, keys), params) as IMyDataloader;
  
    dataloader.dataloader = dataloader;
    dataloader.service = service;
  
    return dataloader;
  };
  
  // tslint:disable-next-line:max-line-length
  const load = async (dataloader: IMyDataloader, name: string, ctx, keys: any, loadMany: boolean) => {
    const emptyResults = loadMany ? [] : null;
  
    // nothing to load
    if (!keys || (Array.isArray(keys) && !keys.length)) {
      return emptyResults;
    }
  
    const count = await dataloader.service.count({_id:{$in:keys}});
  
    // we have to do this check if in keys only 1 item, as dataloader cannot handle it
    if (loadMany && keys.length && count === keys.length) {
      return await dataloader.dataloader.loadMany(keys);
    } else if (!loadMany && count === 1){
      return await dataloader.dataloader.load(keys);
    }
  
    // we just log the error, but we don't provide to frontend
    console.error('Not existing id: ' + keys + ' in name: ' + name);
    console.error(ctx.request.body.query);
    console.error(ctx.request.body.variables);
  
    return emptyResults;
  };
  
  const dataloaderByName = async (name: string, service: IServiceDataloader, ctx, listOfIds, loadMany) => {
    const dataloaderName = name + 'Dataloader';
  
    let dataloader;
    if (ctx.req[dataloaderName]){
      dataloader = ctx.req[dataloaderName];
    } else {
      dataloader = createDataloder(service);
      ctx.req[dataloaderName] = dataloader;
    }
  
    return await load(
      dataloader,
      name,
      ctx,
      listOfIds,
      loadMany,
    );
  };
  
  const processBatches = (keys, callback) => {
    if (Array.isArray(keys) && keys.length) {
      if (Array.isArray(keys[0]) && keys[0].length) {
        return keys.map((subKeys) => {
          return callback(subKeys);
        });
      }
  
      return callback(keys);
    }
  
    if (keys !== undefined && callback) {
      return callback(keys);
    }
  };
  
  const batchFind = async (service: IServiceDataloader, keys) => {
    // tslint:disable-next-line:ter-arrow-parens
    return await processBatches(keys, async (batchKeys) => {
      return await service.find({_id: {$in: keys}});
    });
  };
  
  
  export const generateDataloaders = (entry) => {

`;


  for (const model of models) {
    const modelName = model.modelName;
    const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    body += `

    entry.dataloaders['${lower}'] = async (ctx, ${lower}Ids, loadMany) => {
      return await dataloaderByName('${lower}', entry.models['${lower}'], ctx, ${lower}Ids, loadMany);
    };
    `;
  }

  body += '}\n';

  return body;
};
