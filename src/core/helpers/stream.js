export function emitLines(stream) {
    let backlog = '';

    stream.on('data', (data) => {
        backlog += data;

        let n = backlog.indexOf('\n');

        // got a \n? emit one or more 'line' events
        while(~n) {
            stream.emit('line', backlog.substring(0, n));

            backlog = backlog.substring(n + 1);
            n = backlog.indexOf('\n');
        }
    });

    stream.on('end', () => {
        if(backlog) {
            stream.emit('line', backlog);
        }
    });
}
