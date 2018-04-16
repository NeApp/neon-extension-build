import * as Travis from './travis';


describe('Commands', () => {
    describe('install:travis', () => {
        describe('getBranches', () => {
            it('should handle default branches', () => {
                expect(Travis.getBranches('develop')).toEqual([
                    'develop',
                    'master'
                ]);

                expect(Travis.getBranches('master')).toEqual([
                    'master',
                    'develop'
                ]);
            });

            it('should handle unknown branches', () => {
                expect(Travis.getBranches('feature/test')).toEqual([
                    'feature/test',
                    'develop',
                    'master'
                ]);
            });

            it('should handle version tags', () => {
                expect(Travis.getBranches('v1.0.0')).toEqual([
                    'v1.0.0',
                    'master'
                ]);
            });
        });
    });
});
