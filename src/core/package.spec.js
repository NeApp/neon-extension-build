import {updatePackage, updatePackageLocks} from './package';


describe('Package', () => {
    describe('updatePackage', () => {
        it('should update dependencies', () => {
            expect(updatePackage({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': '1.9.0',
                    'neon-extension-framework': '1.9.0',
                    'neon-extension-destination-lastfm': '1.9.0',
                    'neon-extension-destination-librefm': '1.9.0'
                }
            }, {
                'neon-extension-framework': {
                    from: 'neon-extension-framework@NeApp/neon-extension-framework#alpha',
                    version: 'NeApp/neon-extension-framework#alpha'
                },

                'neon-extension-destination-lastfm': '2.0.0'
            })).toEqual({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': '1.9.0',
                    'neon-extension-framework': 'NeApp/neon-extension-framework#alpha',
                    'neon-extension-destination-lastfm': '2.0.0',
                    'neon-extension-destination-librefm': '1.9.0'
                }
            });
        });

        it('should update peer dependencies', () => {
            expect(updatePackage({
                name: 'neon-extension-chrome',

                dependencies: {
                    'lodash': '^4.17.5'
                },

                peerDependencies: {
                    'neon-extension-core': '1.9.0',
                    'neon-extension-framework': '1.9.0',
                    'neon-extension-destination-lastfm': '1.9.0',
                    'neon-extension-destination-librefm': '1.9.0'
                }
            }, {
                'neon-extension-framework': '2.0.0',
                'neon-extension-destination-lastfm': '2.0.0'
            })).toEqual({
                name: 'neon-extension-chrome',

                dependencies: {
                    'lodash': '^4.17.5'
                },

                peerDependencies: {
                    'neon-extension-core': '1.9.0',
                    'neon-extension-framework': '2.0.0',
                    'neon-extension-destination-lastfm': '2.0.0',
                    'neon-extension-destination-librefm': '1.9.0'
                }
            });
        });
    });

    describe('updatePackageLocks', () => {
        it('should remove "integrity" fields', () => {
            expect(updatePackageLocks({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': {
                        version: '1.9.0',
                        integrity: 'test'
                    },
                    'neon-extension-framework': {
                        version: '1.9.0'
                    },
                    'neon-extension-destination-lastfm': {
                        version: '1.9.0'
                    },
                    'neon-extension-destination-librefm': {
                        version: '1.9.0'
                    }
                }
            })).toEqual({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': {
                        version: '1.9.0'
                    },
                    'neon-extension-framework': {
                        version: '1.9.0'
                    },
                    'neon-extension-destination-lastfm': {
                        version: '1.9.0'
                    },
                    'neon-extension-destination-librefm': {
                        version: '1.9.0'
                    }
                }
            });
        });

        it('should update package "version"', () => {
            expect(updatePackageLocks({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': {
                        version: '1.9.0'
                    },
                    'neon-extension-framework': {
                        version: '1.9.0'
                    },
                    'neon-extension-destination-lastfm': {
                        version: '1.9.0'
                    },
                    'neon-extension-destination-librefm': {
                        version: '1.9.0'
                    }
                }
            }, {
                'neon-extension-framework': '2.0.0',
                'neon-extension-destination-lastfm': '2.0.0'
            })).toEqual({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': {
                        version: '1.9.0'
                    },
                    'neon-extension-framework': {
                        version: '2.0.0'
                    },
                    'neon-extension-destination-lastfm': {
                        version: '2.0.0'
                    },
                    'neon-extension-destination-librefm': {
                        version: '1.9.0'
                    }
                }
            });
        });

        it('should update package "from"', () => {
            expect(updatePackageLocks({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': {
                        version: '1.9.0'
                    },
                    'neon-extension-framework': {
                        from: 'neon-extension-framework@NeApp/neon-extension-framework#alpha',
                        version: 'NeApp/neon-extension-framework#alpha'
                    },
                    'neon-extension-destination-lastfm': {
                        from: 'neon-extension-destination-lastfm@NeApp/neon-extension-destination-lastfm#alpha',
                        version: 'NeApp/neon-extension-destination-lastfm#alpha'
                    },
                    'neon-extension-destination-librefm': {
                        version: '1.9.0'
                    }
                }
            }, {
                'neon-extension-framework': {
                    from: 'neon-extension-framework@NeApp/neon-extension-framework#beta',
                    version: 'NeApp/neon-extension-framework#beta'
                },

                'neon-extension-destination-lastfm': '2.0.0'
            })).toEqual({
                name: 'neon-extension-chrome',

                dependencies: {
                    'neon-extension-core': {
                        version: '1.9.0'
                    },
                    'neon-extension-framework': {
                        from: 'neon-extension-framework@NeApp/neon-extension-framework#beta',
                        version: 'NeApp/neon-extension-framework#beta'
                    },
                    'neon-extension-destination-lastfm': {
                        version: '2.0.0'
                    },
                    'neon-extension-destination-librefm': {
                        version: '1.9.0'
                    }
                }
            });
        });
    });
});
