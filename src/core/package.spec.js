import {updatePackage, updatePackageLocks} from './package';


describe('Package', () => {
    describe('updatePackage', () => {
        it('should update dependencies', () => {
            expect(updatePackage({
                name: '@radon-extension/chrome',

                dependencies: {
                    '@radon-extension/core': '1.9.0',
                    '@radon-extension/framework': '1.9.0',
                    '@radon-extension/plugin-lastfm': '1.9.0',
                    '@radon-extension/plugin-librefm': '1.9.0'
                }
            }, {
                '@radon-extension/framework': {
                    from: '@radon-extension/framework@RadonApp/radon-extension-framework#alpha',
                    version: 'RadonApp/radon-extension-framework#alpha'
                },

                '@radon-extension/plugin-lastfm': '2.0.0'
            })).toEqual({
                name: '@radon-extension/chrome',

                dependencies: {
                    '@radon-extension/core': '1.9.0',
                    '@radon-extension/framework': 'RadonApp/radon-extension-framework#alpha',
                    '@radon-extension/plugin-lastfm': '2.0.0',
                    '@radon-extension/plugin-librefm': '1.9.0'
                }
            });
        });

        it('should update peer dependencies', () => {
            expect(updatePackage({
                name: '@radon-extension/chrome',

                dependencies: {
                    'lodash': '^4.17.5'
                },

                peerDependencies: {
                    '@radon-extension/core': '1.9.0',
                    '@radon-extension/framework': '1.9.0',
                    '@radon-extension/plugin-lastfm': '1.9.0',
                    '@radon-extension/plugin-librefm': '1.9.0'
                }
            }, {
                '@radon-extension/framework': '2.0.0',
                '@radon-extension/plugin-lastfm': '2.0.0'
            })).toEqual({
                name: '@radon-extension/chrome',

                dependencies: {
                    'lodash': '^4.17.5'
                },

                peerDependencies: {
                    '@radon-extension/core': '1.9.0',
                    '@radon-extension/framework': '2.0.0',
                    '@radon-extension/plugin-lastfm': '2.0.0',
                    '@radon-extension/plugin-librefm': '1.9.0'
                }
            });
        });
    });

    describe('updatePackageLocks', () => {
        it('should remove "integrity" fields', () => {
            expect(updatePackageLocks({
                name: '@radon-extension/chrome',
                version: '1.9.0',

                dependencies: {
                    '@radon-extension/core': {
                        version: '1.9.0',
                        integrity: 'test'
                    },
                    '@radon-extension/framework': {
                        version: '1.9.0'
                    },
                    '@radon-extension/plugin-lastfm': {
                        version: '1.9.0'
                    },
                    '@radon-extension/plugin-librefm': {
                        version: '1.9.0'
                    }
                }
            })).toEqual({
                name: '@radon-extension/chrome',
                version: '1.9.0',

                dependencies: {
                    '@radon-extension/core': {
                        version: '1.9.0'
                    },
                    '@radon-extension/framework': {
                        version: '1.9.0'
                    },
                    '@radon-extension/plugin-lastfm': {
                        version: '1.9.0'
                    },
                    '@radon-extension/plugin-librefm': {
                        version: '1.9.0'
                    }
                }
            });
        });

        it('should update package "version"', () => {
            expect(updatePackageLocks({
                name: '@radon-extension/chrome',
                version: '1.9.0',

                dependencies: {
                    '@radon-extension/core': {
                        version: '1.9.0'
                    },
                    '@radon-extension/framework': {
                        version: '1.9.0'
                    },
                    '@radon-extension/plugin-lastfm': {
                        version: '1.9.0'
                    },
                    '@radon-extension/plugin-librefm': {
                        version: '1.9.0'
                    }
                }
            }, {
                '@radon-extension/framework': '2.0.0',
                '@radon-extension/plugin-lastfm': '2.0.0'
            })).toEqual({
                name: '@radon-extension/chrome',
                version: '1.9.0',

                dependencies: {
                    '@radon-extension/core': {
                        version: '1.9.0'
                    },
                    '@radon-extension/framework': {
                        version: '2.0.0'
                    },
                    '@radon-extension/plugin-lastfm': {
                        version: '2.0.0'
                    },
                    '@radon-extension/plugin-librefm': {
                        version: '1.9.0'
                    }
                }
            });
        });

        it('should update package "from"', () => {
            expect(updatePackageLocks({
                name: '@radon-extension/chrome',
                version: '1.9.0',

                dependencies: {
                    '@radon-extension/core': {
                        version: '1.9.0'
                    },
                    '@radon-extension/framework': {
                        from: '@radon-extension/framework@RadonApp/radon-extension-framework#alpha',
                        version: 'RadonApp/radon-extension-framework#alpha'
                    },
                    '@radon-extension/plugin-lastfm': {
                        from: '@radon-extension/plugin-lastfm@RadonApp/radon-extension-plugin-lastfm#alpha',
                        version: 'RadonApp/radon-extension-plugin-lastfm#alpha'
                    },
                    '@radon-extension/plugin-librefm': {
                        version: '1.9.0'
                    }
                }
            }, {
                '@radon-extension/framework': {
                    from: '@radon-extension/framework@RadonApp/radon-extension-framework#beta',
                    version: 'RadonApp/radon-extension-framework#beta'
                },

                '@radon-extension/plugin-lastfm': '2.0.0'
            })).toEqual({
                name: '@radon-extension/chrome',
                version: '1.9.0',

                dependencies: {
                    '@radon-extension/core': {
                        version: '1.9.0'
                    },
                    '@radon-extension/framework': {
                        from: '@radon-extension/framework@RadonApp/radon-extension-framework#beta',
                        version: 'RadonApp/radon-extension-framework#beta'
                    },
                    '@radon-extension/plugin-lastfm': {
                        version: '2.0.0'
                    },
                    '@radon-extension/plugin-librefm': {
                        version: '1.9.0'
                    }
                }
            });
        });
    });
});
