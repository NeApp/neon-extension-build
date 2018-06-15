import GentleFS from 'gentle-fs';
import IsNil from 'lodash/isNil';


export function create(link, target, prefixes) {
    if(IsNil(link)) {
        return Promise.reject(new Error('Invalid value provided for the "link" parameter'));
    }

    if(IsNil(target)) {
        return Promise.reject(new Error('Invalid value provided for the "target" parameter'));
    }

    if(IsNil(prefixes)) {
        return Promise.reject(new Error('Invalid value provided for the "prefixes" parameter'));
    }

    return new Promise((resolve, reject) => {
        GentleFS.link(target, link, {prefixes}, (err) => {
            if(err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

export default {
    create
};
