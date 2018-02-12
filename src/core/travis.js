import IsNil from 'lodash/isNil';
import OmitBy from 'lodash/omitBy';
import Process from 'process';


export class Travis {
    get branch() {
        let branch = Process.env['TRAVIS_BRANCH'] || null;

        if(IsNil(branch) || branch === this.tag) {
            return null;
        }

        return branch;
    }

    get commit() {
        return Process.env['TRAVIS_COMMIT'] || null;
    }

    get tag() {
        return Process.env['TRAVIS_TAG'] || null;
    }

    get number() {
        return Process.env['TRAVIS_BUILD_NUMBER'] || null;
    }

    status() {
        if(IsNil(this.number)) {
            return {};
        }

        return {
            branch: this.branch,
            commit: this.commit,
            tag: this.tag,

            number: this.number
        };
    }
}

export default new Travis();
