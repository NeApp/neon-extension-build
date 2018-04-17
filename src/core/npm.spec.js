import {getBranches} from './npm';


describe('Commands', () => {
    describe('install:travis', () => {
        describe('getBranches', () => {
            it('should handle default branches', () => {
                expect(getBranches('develop')).toEqual([
                    'develop',
                    'master'
                ]);

                expect(getBranches('master')).toEqual([
                    'master',
                    'develop'
                ]);
            });

            it('should handle unknown branches', () => {
                expect(getBranches('feature/test')).toEqual([
                    'feature/test',
                    'develop',
                    'master'
                ]);
            });

            it('should handle version tags', () => {
                expect(getBranches('v1.0.0')).toEqual([
                    'v1.0.0',
                    'master'
                ]);
            });
        });
    });
});
