import {getBranches} from './install';


describe('Commands', () => {
    describe('install:travis', () => {
        describe('getBranches', () => {
            it('master', () => {
                expect(getBranches('master')).toEqual([
                    'master'
                ]);
            });

            it('develop', () => {
                expect(getBranches('develop')).toEqual([
                    'develop'
                ]);
            });

            it('feature/test', () => {
                expect(getBranches('feature/test')).toEqual([
                    'feature/test',
                    'develop'
                ]);
            });

            it('v1.9.0', () => {
                expect(getBranches('v1.9.0')).toEqual([
                    'v1.9.0',
                    'v1.9'
                ]);
            });

            it('v1.9.0-beta.1', () => {
                expect(getBranches('v1.9.0-beta.1')).toEqual([
                    'v1.9.0-beta.1',
                    'v1.9'
                ]);
            });

            it('v1.9', () => {
                expect(getBranches('v1.9')).toEqual([
                    'v1.9',
                    'develop'
                ]);
            });
        });
    });
});
