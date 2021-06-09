export const generateCreate__ENTITY_NAME__ = (entry) => (entity) => {

}
export const generateUpdate__ENTITY_NAME__ = (entry) => (entity) => {

}

export const generateRemove__ENTITY_NAME__ = (entry) => (entity) => {

}

export function generate__ENTITY_NAME__Service(entry){
    return {
        create: generateCreate__ENTITY_NAME__(entry),
        update: generateUpdate__ENTITY_NAME__(entry),
        remove: generateRemove__ENTITY_NAME__(entry)
    }
}