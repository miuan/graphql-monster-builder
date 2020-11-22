import * as yargs from 'yargs'

// NOTE: loger need to be fist 
//       before any custom lib
import log, {setupLogLevel} from './services/log'
import { exportAs } from './services/build'

const argv = yargs
    .usage('Usage: $0 <command> [options] path/to/schema.file [desctination/folder]')
    .example('$0 -bd -d models.schema ../server', 'create server')
    .example('$0 -fd -d models.schema ../frontend', 'create client')
    
    .command('frontend', 'build client from schema', {
        client: {
            description: 'the year to check for',
            alias: 'fd',
            type: 'string',
        }
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
    // await exportAs('protectql', './graphql/protectql.schema');
    const schema = argv._[0]
    const outDir = argv._[1]
    log.info(`Generate schema: '${schema} to ${outDir}`)
    await exportAs(outDir, schema);

    log.info(`Done. Next step:`)
    log.info(`\tcd ${outDir}/ && yarn && yarn start\n`)
  }));
