import IsNil from 'lodash/isNil';


export default class ValidatorPlugin {
    constructor(validator, browser, environment) {
        this.validator = validator;

        this.browser = browser;
        this.environment = environment;
    }

    apply(compiler) {
        compiler.plugin('compilation', compilation => {
            compilation.plugin('after-optimize-chunks', (chunks) => {
                // Process named chunks
                let count = 0;

                chunks.forEach((chunk) => {
                    if(IsNil(chunk.name)) {
                        return;
                    }

                    // Process modules
                    chunk.forEachModule((module) => {
                        // Validate module
                        this.validator.validate(this.browser, this.environment, module);
                    });

                    count++;
                });

                // Finish module validation
                if(count > 0) {
                    this.validator.finish(this.browser, this.environment);
                }
            });
        });
    }
}
