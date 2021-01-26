import { exec, ExecException } from "child_process"

export const SERVICE_NAME = process.env.SERVICE_NAME
export const EMAIL_FROM = process.env.EMAIL_FROM
export const URL_HOST = process.env.URL_HOST
export const EMAIL_WELLCOME_MESSAGE = process.env.EMAIL_WELLCOME_MESSAGE
export const EMAIL_WELLCOME_TITLE = process.env.EMAIL_WELLCOME_TITLE
export const EMAIL_FORGOTTEN_PASSWORD_MESSAGE = process.env.EMAIL_FORGOTTEN_PASSWORD_MESSAGE
export const EMAIL_FORGOTTEN_PASSWORD_TITLE = process.env.EMAIL_FORGOTTEN_PASSWORD_TITLE

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
    const title = rawTitle.replace(/{{URL_HOST}}/g, URL_HOST).replace(/{{EMAIL_FROM}}/g, EMAIL_FROM).replace(/{{SERVICE_NAME}}/g, SERVICE_NAME)
    const message = rawMessage.replace(/{{URL_HOST}}/g, URL_HOST).replace(/{{EMAIL_FROM}}/g, EMAIL_FROM).replace(/{{SERVICE_NAME}}/g, SERVICE_NAME)
    run(`echo "${message}" | mail -a "Content-type: text/html;\nFrom: ${EMAIL_FROM}" -s "${title}" ${emailTo}`)
}

export default sendMail

