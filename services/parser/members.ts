import { SchemaModel, SchemaModelMember, SchemaModelRelation, SchemaModelRelationType } from '../common/types'

export const extractMemberFromLineParams = (member: SchemaModelMember, params) => {
    if (params === '@unique' || params === '@isUnique') {
        member.isUnique = true
    }

    // https://stackoverflow.com/questions/16061744/mongoose-how-to-define-a-combination-of-fields-to-be-unique
    else if (params.startsWith('@isUnique(combinationWith:')) {
        // handle maximum 5
        // @isUnique(combinationWith:"Milan1",andCombinationWith:"Jirka2", andCombinationWith:"Karel3", andCombinationWith:"Ondra4", andCombinationWith:"Petr5")
        const splited = params.split('"')
        // Milan1
        member.isUnique = [splited[1]]
        // Jirka2
        if (splited[3]) {
            member.isUnique.push(splited[3])
        }

        // Karel3
        if (splited[5]) {
            member.isUnique.push(splited[5])
        }
        // Ondra4
        if (splited[7]) {
            member.isUnique.push(splited[7])
        }
        // Petr5
        if (splited[9]) {
            member.isUnique.push(splited[9])
        }
    } else if (params === '@readonly' || params === '@isReadonly') {
        member.isReadonly = true
    } else if (params.startsWith('@relation(name:')) {
        const name = params.split('"')[1]
        if (name.startsWith('_')) throw `Line: ${member.row} relation name starting with '_' as your '${name}' is reserved`
        member.relation = { name } as SchemaModelRelation
    } else if (params.startsWith('@default')) {
        if (member.isArray) {
            throw new Error(`Line: ${member.row}: modificator @default is not suitable for members with array type`)
        }

        const match = params.match(/@default\( *((:?"(?<hasText>[^"]*)")|(?<hasNumber>[0-9]+)|(?<hasBoolean>true|false)) *\)/)
        const { hasText, hasNumber, hasBoolean } = match?.groups

        if (!hasText && !hasNumber && !hasBoolean) {
            throw new Error(
                `Line: ${member.row}: modificator @default must have a text value in double-qutes like @default("default-value") or number can be without quotes @default(3) or true and false value`,
            )
        }

        if (hasText != undefined) {
            if (member.type != 'String') {
                throw new Error(
                    `Line: ${member.row}: modificator @default contain a text, but member with name '${member.name}' is type '${member.type}'. Only members with type 'String' could have a default text value.`,
                )
            }
            member.default = hasText
        }

        if (hasNumber != undefined) {
            if (member.type != 'Int' && member.type != 'Float') {
                throw new Error(
                    `Line: ${member.row}: modificator @default contain a number, but member with name '${member.name}' is type '${member.type}'. Only members with type 'Int' or 'Float' could have a default number value.`,
                )
            }
            member.default = Number(hasNumber)
        }

        if (hasBoolean != undefined) {
            if (member.type != 'Boolean') {
                throw new Error(
                    `Line: ${member.row}: modificator @default contain a boolean value, but member with name '${member.name}' is type '${member.type}'. Only members with type 'Boolean' could have a default boolean value.`,
                )
            }
            member.default = hasBoolean === 'true'
        }
    } else if (params.startsWith('@placeholder')) {
        const regexp = new RegExp(/(?<=")(?:\\.|[^"\\])*(?=")/)
        const matched = params.match(regexp)

        if (!matched) {
            throw new Error(`Line: ${member.row}: modificator @placeholder must have a text value in double-qutes like @placeholder("placeholder-value")`)
        }

        member.placeholder = matched[0]
    } else if (params.startsWith('@regExp')) {
        const regexp = new RegExp(/(?<=")(?:\\.|[^"\\])*(?=")/)
        const matched = params.match(regexp)

        if (!matched) {
            throw new Error(`Line: ${member.row}: modificator @regExp must have a text vsalue in double-qutes like @regExp("regExp-value")`)
        }

        member.regExp = matched[0]
    } else if (params === '@virtual' || params === '@isVirtual') {
        member.isVirtual = true
    } else if (params === '@hidden' || params === '@isHidden') {
        member.isHidden = true
    } else {
        throw new Error(`Line: ${member.row}: unknown param '${params}'`)
    }
}
