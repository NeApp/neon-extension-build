export function resolveOne(items, target) {
    return new Promise((resolve, reject) => {
        let position = 0;

        function next() {
            if(position >= items.length) {
                resolve(null);
                return;
            }

            // Run next promise
            target(items[position++]).then((result) => {
                resolve(result);
            }, () => {
                next();
            });
        }

        next();
    });
}

export function runSequential(items, target) {
    return new Promise((resolve, reject) => {
        let position = 0;
        let results = [];

        function next() {
            if(position >= items.length) {
                resolve(results);
                return;
            }

            // Run next promise
            target(items[position++]).then((result) => {
                results.push(result);
                next();
            }, (err) => {
                reject(err);
            });
        }

        next();
    });
}
