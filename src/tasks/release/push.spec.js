import {getTargetBranches} from './push';


describe('Tasks', () => {
    describe('release:push', () => {
        describe('getTargetBranches', () => {
            it('v1.9.0-beta.1', () => {
                expect(getTargetBranches('v1.9.0-beta.1')).toEqual([
                    'develop',
                    'v1.9'
                ]);
            });

            it('v1.9.0', () => {
                expect(getTargetBranches('v1.9.0')).toEqual([
                    'develop',
                    'v1.9',
                    'master'
                ]);
            });

            it('v1.9.1-beta.1', () => {
                expect(getTargetBranches('v1.9.1-beta.1')).toEqual([
                    'v1.9'
                ]);
            });

            it('v1.9.1', () => {
                expect(getTargetBranches('v1.9.1')).toEqual([
                    'v1.9',
                    'master'
                ]);
            });
        });
    });
});
