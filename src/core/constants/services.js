const Services = {
    Configuration: 'Configuration',
    Migrate: 'Migrate',

    Destination: {
        Scrobble: 'Destination:Scrobble',
        Sync: 'Destination:Sync'
    },

    Source: {
        Activity: 'Source:Activity',
        Library: 'Source:Library',
        Sync: 'Source:Sync'
    }
};

export const ServiceIds = [
    Services.Configuration,
    Services.Migrate,

    Services.Destination.Scrobble,
    Services.Destination.Sync,

    Services.Source.Activity,
    Services.Source.Library,
    Services.Source.Sync
];

export const ServiceOptions = {
    [Services.Migrate]: { include: false }
};

export default Services;
