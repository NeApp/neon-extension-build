import {getModuleVersions} from './source';


describe('Tasks', () => {
    describe('archive:source', () => {
        describe('getModuleVersions', () => {
            it('should return versions for tagged commits', () => {
                expect(getModuleVersions({
                    modules: {
                        'framework': {
                            repository: {
                                tag: 'v1.9.0'
                            }
                        }
                    }
                })).toEqual({
                    'framework': '1.9.0'
                });
            });

            it('should return GitHub URLs for untagged commits', () => {
                expect(getModuleVersions({
                    modules: {
                        'framework': {
                            name: '@radon-extension/framework',

                            repository: {
                                url: 'https://github.com/RadonApp/radon-extension-framework',
                                commit: 'abc123',
                                tag: null
                            }
                        }
                    }
                })).toEqual({
                    'framework': {
                        from: '@radon-extension/framework@RadonApp/radon-extension-framework#abc123',
                        version: 'RadonApp/radon-extension-framework#abc123'
                    }
                });
            });
        });
    });
});
