import * as yargs from 'yargs'
import { exportAs } from './build';

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

new Promise(async() => {
    console.log(argv);
    // await exportAs('protectql', './graphql/protectql.schema');
    const name = argv._[1]
    await exportAs(name, argv._[0]);
    console.log(`done`)
    console.log(``)
    console.log(``)
    console.log(`Next step:`)
    console.log(``)
    console.log(`cd ${name}/ && yarn && yarn start`)
    console.log(``)
  });
