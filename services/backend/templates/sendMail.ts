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

function sendMail(emailFrom, emailTo, rawTitle, rawMessage){
    console.log('mail', `mail -a "Content-type: text/html;\nFrom: ${emailFrom}" -s "${rawTitle}" ${emailTo}`)
    run(`echo "${rawMessage}" | mail -a "Content-type: text/html;\nFrom: ${emailFrom}" -s "${rawTitle}" ${emailTo}`)
}

export function registerSendMailService(config){
    const {
        SERVICE_URL, 
        REPLY_EMAIL,
        NOTREPLY_EMAIL,
        SERVICE_NAME,
        EMAIL_WELLCOME_TITLE = 'Wellcome in {{SERVICE_NAME}}',
        EMAIL_WELLCOME_MESSAGE = 'Please verify your email by click to this <a href="{{SERVICE_URL}}/email/{{USER_VERIFY_TOKEN}}/verify">{{SERVICE_URL}}/email/{{SERVICE_URL}}/verify</a>',
        EMAIL_FORGOTTEN_PASSWORD_TITLE = 'Change password request for {{SERVICE_NAME}}',
        EMAIL_FORGOTTEN_PASSWORD_MESSAGE = 'We recaive request about reset Your password. If is not your action, please ignore this message. If you want reset your password follow instruction on this link <a href="{{SERVICE_URL}}/forgotten-password/{{USER_RESET_PASSWORD_TOKEN}}">{{SERVICE_URL}}/forgotten-password/{{USER_RESET_PASSWORD_TOKEN}}</a>'
    } = config

    function replaceWithConfig(text){
        return text.replace(/{{SERVICE_URL}}/g, SERVICE_URL).replace(/{{SERVICE_NAME}}/g, SERVICE_NAME)
    }
    
    const sendMailService = {
        sendVerifyEmail: async (user) => {
            const welcome = replaceWithConfig(EMAIL_WELLCOME_TITLE)
            const message = replaceWithConfig(EMAIL_WELLCOME_MESSAGE).replace(/{{USER_VERIFY_TOKEN}}/g, user.__verifyToken)
            return sendMailService.sendMail(REPLY_EMAIL, user.email, welcome, message)
        },
        sendForgottenPasswordEmail: async (user) => {
            const title = replaceWithConfig(EMAIL_FORGOTTEN_PASSWORD_TITLE)
            const message = replaceWithConfig(EMAIL_FORGOTTEN_PASSWORD_MESSAGE).replace(/{{USER_RESET_PASSWORD_TOKEN}}/g, user.__resetPasswordToken)
            return sendMailService.sendMail(REPLY_EMAIL, user.email, title, message)
        },
        sendMail,
        replaceWithConfig
    }

    return sendMailService
}


