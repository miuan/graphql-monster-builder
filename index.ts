import * as yargs from 'yargs'

// NOTE: loger need to be fist 
//       before any custom lib
import log, {setupLogLevel} from './services/log'

import { frontendFromSchema } from './services/frontend/frontend';
import { exportAs } from './services/backend/build';

const argv = yargs
    .usage('Usage: $0 <command> [options] path/to/schema.file [desctination/folder]')
    .example('$0 -bd -d models.schema ../server', 'create server')
    .example('$0 -fd -d models.schema ../frontend', 'create client')
    
    .option('frontend', {
        alias: 'fd',
        description: 'build client from schema',
        type: 'boolean',
        default: false,
    }).option('backend', {
        alias: 'bd',
        description: 'build server from schema',
        type: 'boolean',
        default: true,
    })
    .option('docker', {
        alias: 'd',
        description: 'Generate docker file (not implemented yet)',
        type: 'boolean',
    })
    .help()
    .alias('help', 'h')
    .argv;

(new Promise(async() => {
    log.debug(argv);
    const schema = argv._[0]
    const outDir = argv._[1]
    log.info(`Generate schema: '${schema} to ${outDir}`)
    const start = Date.now();
  
    if(argv.fd) await frontendFromSchema(outDir, schema, outDir);
    else await exportAs(outDir, schema, outDir);
    
    const ms = Date.now() - start;

    log.info(`Done in ${ms}ms. Next step:`)
    log.info(`\tcd ${outDir}/ && yarn && yarn start\n`)
  }));
