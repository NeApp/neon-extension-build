const DevelopmentEnvironment = {
    name: 'development',

    webpack: {
        debug: true,
        minimize: false,
        validate: true,

        devtool: 'cheap-module-source-map'
    }
};

const ProductionEnvironment = {
    name: 'production',

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
