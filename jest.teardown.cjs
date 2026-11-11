const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const mongoose = require('mongoose')

module.exports = async () => {
    const runId = process.env.GMB_TEST_RUN_ID
    if (!runId || !/^[a-z0-9_]+$/.test(runId)) return
    const ledger = path.join(os.tmpdir(), `gmb-test-databases-${runId}.jsonl`)
    if (!fs.existsSync(ledger)) return
    const databases = new Map()
    for (const line of fs.readFileSync(ledger, 'utf8').trim().split('\n')) {
        const { database, host } = JSON.parse(line)
        if (!/^test[-_]/.test(database) || !database.includes(`_${runId}_`)) {
            throw new Error('Refusing to clean a database outside this test run')
        }
        databases.set(`${host}/${database}`, { database, host })
    }
    for (const { database, host } of databases.values()) {
        const connection = await mongoose.createConnection(`mongodb://${host}:27017/${database}`, { serverSelectionTimeoutMS: 5000 }).asPromise()
        try {
            await connection.dropDatabase()
        } finally {
            await connection.close()
        }
    }
    fs.unlinkSync(ledger)
}
