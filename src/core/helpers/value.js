import IsNil from 'lodash/isNil';


export function capitalize(value) {
    if(IsNil(value) || value.length < 1) {
        return value;
    }

    return value[0].toUpperCase() + value.substring(1);
}

export function sortKey(value) {
    if(IsNil(value)) {
        return null;
    }

    return value.replace(/[^a-zA-Z]/g, '').toLowerCase();
}
