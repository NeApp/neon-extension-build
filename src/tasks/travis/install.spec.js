import {getBranches} from './install';


describe('Commands', () => {
    describe('install:travis', () => {
        describe('getBranches', () => {
            it('master', () => {
                expect(getBranches('master')).toEqual([
                    'master',
                    'develop'
                ]);
            });

            it('develop', () => {
                expect(getBranches('develop')).toEqual([
                    'develop',
                    'master'
                ]);
            });

            it('feature/test', () => {
                expect(getBranches('feature/test')).toEqual([
                    'feature/test',
                    'develop',
                    'master'
                ]);
            });

            it('v1.9.0', () => {
                expect(getBranches('v1.9.0')).toEqual([
                    'v1.9.0',
                    'master'
                ]);
            });

            it('v1.9.0-beta.1', () => {
                expect(getBranches('v1.9.0-beta.1')).toEqual([
                    'v1.9.0-beta.1',
                    'develop',
                    'master'
                ]);
            });
        });
    });
});
