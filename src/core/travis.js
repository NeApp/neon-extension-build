import IsNil from 'lodash/isNil';
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

        let result = {
            commit: this.commit,
            tag: this.tag,

            number: this.number
        };

        if(this.branch !== this.tag) {
            result.branch = this.branch;
        }

        return result;
    }
}

export default new Travis();
