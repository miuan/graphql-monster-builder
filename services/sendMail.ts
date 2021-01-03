import { exec, ExecException } from "child_process"

const EMAIL_FROM = process.env.EMAIL_FROM
const URL_HOST = process.env.URL_HOST
const SERVICE_NAME = process.env.SERVICE_NAME

export const EMAIL_WELLCOME_MESSAGE = process.env.EMAIL_MESSAGE_WELLCOME
export const EMAIL_WELLCOME_TITLE = process.env.EMAIL_WELLCOME_TITLE

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

export const sendMail = async (emailTo, rawTitle, rawMessage) => {
    const message = rawMessage.replaceAll('{{URL_HOST}}', URL_HOST).replaceAll('{{EMAIL_FROM}}', EMAIL_FROM).replaceAll('{{SERVICE_NAME}}', SERVICE_NAME)
    const title = rawTitle.replaceAll('{{URL_HOST}}', URL_HOST).replaceAll('{{EMAIL_FROM}}', EMAIL_FROM).replaceAll('{{SERVICE_NAME}}', SERVICE_NAME)
    run(`echo "${message}" | mail -a "Content-type: text/html;\nFrom: ${EMAIL_FROM}" -s "${title}" ${emailTo}`)
}

export default sendMail

