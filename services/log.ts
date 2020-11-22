import log, {LogLevelDesc} from 'loglevel'
import * as prefix from 'loglevel-plugin-prefix'
import * as dotenv from 'dotenv-flow'

export const setupLogLevel = () => {
    prefix.reg(log)
    //prefix.apply(log, { template: '[%t] (%n)' })
    prefix.apply(log, { template: '[%t] %l (%n)' })
    if (process.env.NODE_ENV === 'test') {
        log.disableAll()
        console.log('log.disableAll()')
    } else if(process.env.LOGLEVEL) {
        log.setDefaultLevel(process.env.LOGLEVEL as LogLevelDesc)
        console.log(`Log set to level: ${log.getLevel()}`)
    } else {
        console.log(`Log level: ${log.getLevel()}`)
    }
}

// most of test are not comming from main js file
// where are call `setupLogLevel`
if (process.env.NODE_ENV === 'test') {
    log.disableAll()
}

dotenv.config({
    path: './config/environment'
})
setupLogLevel()

export default log
