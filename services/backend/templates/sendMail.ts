import { exec, ExecException } from "child_process"

const EMAIL_FROM = process.env.EMAIL_FROM
const URL_HOST = process.env.URL_HOST


type RunType = [ExecException, string, string]
export const run = async (cmd): Promise<RunType> => ( new Promise<RunType>((resolve, reject)=>{
    const config = {
        env: {...process.env}
    } 
    
    delete config.env.ADMIN_EMAIL
    delete config.env.ADMIN_PASSWORD
    delete config.env.PORT
    
    exec(cmd, config, (error, stdout, stderr) => {
            resolve([error, stdout, stderr])
        })
    })
)

export const sendMail = async (emailTo, rawMessage) => {
    const message = rawMessage.replaceAll('{{URL_HOST}}', URL_HOST).replaceAll('{{EMAIL_FROM}}', EMAIL_FROM)
    run(`echo "${message}" | mail -a "Content-type: text/html;\nFrom: ${EMAIL_FROM}" -s "Welcome to ProtectQL" ${emailTo}`)
}

export default sendMail

