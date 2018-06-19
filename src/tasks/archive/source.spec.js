import {getModuleVersions} from './source';


describe('Tasks', () => {
    describe('archive:source', () => {
        describe('getModuleVersions', () => {
            it('should return versions for tagged commits', () => {
                expect(getModuleVersions({
                    modules: {
                        'neon-extension-framework': {
                            repository: {
                                tag: 'v1.9.0'
                            }
                        }
                    }
                })).toEqual({
                    'neon-extension-framework': '1.9.0'
                });
            });

            it('should return GitHub URLs for untagged commits', () => {
                expect(getModuleVersions({
                    modules: {
                        'neon-extension-framework': {
                            name: 'neon-extension-framework',

                            repository: {
                                commit: 'abc123',
                                tag: null
                            }
                        }
                    }
                })).toEqual({
                    'neon-extension-framework': {
                        from: 'neon-extension-framework@NeApp/neon-extension-framework#abc123',
                        version: 'NeApp/neon-extension-framework#abc123'
                    }
                });
            });
        });
    });
});
