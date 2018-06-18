const DevelopmentEnvironment = {
    name: 'development',
    title: 'Development',

    webpack: {
        debug: true,
        minimize: false,
        validate: true,

        devtool: 'cheap-module-source-map'
    }
};

const ProductionEnvironment = {
    name: 'production',
    title: 'Production',

    webpack: {
        debug: false,
        minimize: true,
        validate: false,

        devtool: 'hidden-source-map'
    }
};

export default {
    dev: DevelopmentEnvironment,
    development: DevelopmentEnvironment,

    prod: ProductionEnvironment,
    production: ProductionEnvironment
};
