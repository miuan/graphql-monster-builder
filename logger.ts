import log from 'loglevel'
import prefix from 'loglevel-plugin-prefix'

export const setupLogLevel = () => {
    prefix.reg(log)
    prefix.apply(log, { template: '[%t] %l (%n)' })
    if (process.env.NODE_ENV === 'test') {
        log.disableAll()
        console.log('log.disableAll()')
    } else if(process.env.LOGLEVEL) {
        log.setLevel(process.env.LOGLEVEL)
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

export default log
