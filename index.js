const fs = require('fs-extra');
const parse = require('csv-parse');
const async = require('async');

const inputFile='n26-csv-transactions_280619.csv';

const lines = []

const doSomething = (line) => {
    lines.push(line);
    return Promise.resolve();
}

const parser = parse({delimiter: ','}, (err, data) => {
    async.eachSeries(data, (line, callback) => {
        // do something with the line
        doSomething(line).then(() => {
            // when processing finishes invoke the callback to move to the next one
            callback();
        });
    }, () => {
        const months = lines
            .filter(line => !line[1].includes('Main Account'))
            .filter(line => line[0] !== 'Date')
            .reduce((acc, line) => {
                const month = line[0].substring(0,10);
                const amount = +line[6];
                if (acc.some(m => m.name === month)) {
                    mo = acc.find(m => m.name === month);
                    mo.sum += amount
                } else {
                    acc.push({
                        name: month,
                        sum: amount
                    })
                }
                return acc;
            }, []);

        const sum = months.reduce((acc, curr) => curr.sum ? acc + curr.sum : acc, 0);
        const monthsAbs = months.reduce((acc, mo, idx, arr) => {
            if (idx === 0) {
                acc.push(mo);
            } else {
                acc.push({
                    ...mo,
                    sum: acc[idx-1].sum + mo.sum
                });
            }
            return acc;

        }, []);

        // console.log(months);
        // console.log(monthsAbs);

        const dates = monthsAbs.map(l => l.name);
        const sums = monthsAbs.map(l => l.sum)

        fs.outputJsonSync('./out/dates.json', dates);
        fs.outputJsonSync('./out/sums.json', sums);

        console.log('sum', sum);

    })
});
fs.createReadStream(inputFile).pipe(parser);
