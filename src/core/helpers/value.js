import IsNil from 'lodash/isNil';


export function sortKey(value) {
    if(IsNil(value)) {
        return null;
    }

    return value.replace(/[^a-zA-Z]/g, '').toLowerCase();
}
