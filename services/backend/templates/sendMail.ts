import { exec, ExecException } from "child_process"

export const SERVICE_NAME = () => process.env.SERVICE_NAME
export const EMAIL_FROM = () => process.env.EMAIL_FROM
export const SERVICE_URL = () => process.env.SERVICE_URL
export const EMAIL_WELLCOME_TITLE = () =>  process.env.EMAIL_WELLCOME_TITLE
export const EMAIL_WELLCOME_MESSAGE = () => process.env.EMAIL_WELLCOME_MESSAGE
export const EMAIL_FORGOTTEN_PASSWORD_TITLE = () => process.env.EMAIL_FORGOTTEN_PASSWORD_TITLE
export const EMAIL_FORGOTTEN_PASSWORD_MESSAGE = () => process.env.EMAIL_FORGOTTEN_PASSWORD_MESSAGE

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

export const sendVerifyEmail = async (user) => {
    const welcome = EMAIL_WELLCOME_TITLE() || 'Wellcome in {{SERVICE_NAME}}'
    const message = EMAIL_WELLCOME_MESSAGE() || `Please verify your email by click to this <a href="{{SERVICE_URL}}/email/${user.__verifyToken}/verify">{{SERVICE_URL}}/email/${user.__verifyToken}/verify</a>`
    return sendMail(user.email, welcome, message)
}
  
export const sendForgottenPasswordEmail = async (user) => {
    const welcome = EMAIL_FORGOTTEN_PASSWORD_TITLE() || 'Change password request for {{SERVICE_NAME}}'
    const message = EMAIL_FORGOTTEN_PASSWORD_MESSAGE() || `We recaive request about reset Your password. If is not your action, please ignore this message. If you want reset your password follow instruction on this link <a href="{{SERVICE_URL}}/forgotten-password/${user.__resetPasswordToken}">{{SERVICE_URL}}/forgotten-password/${user.__resetPasswordToken}</a>`
    return sendMail(user.email, welcome, message)
}


export const sendMail = async (emailTo, rawTitle, rawMessage) => {
    const title = rawTitle.replace(/{{SERVICE_URL}}/g, SERVICE_URL()).replace(/{{EMAIL_FROM}}/g, EMAIL_FROM()).replace(/{{SERVICE_NAME}}/g, SERVICE_NAME())
    const message = rawMessage.replace(/{{SERVICE_URL}}/g, SERVICE_URL()).replace(/{{EMAIL_FROM}}/g, EMAIL_FROM()).replace(/{{SERVICE_NAME}}/g, SERVICE_NAME())
    
    console.log('mail', `mail -a "Content-type: text/html;\nFrom: ${EMAIL_FROM()}" -s "${title}" ${emailTo}`)
    run(`echo "${message}" | mail -a "Content-type: text/html;\nFrom: ${EMAIL_FROM()}" -s "${title}" ${emailTo}`)
}

export default sendMail
