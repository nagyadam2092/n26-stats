const fs = require('fs-extra');
const parse = require('csv-parse');
const async = require('async');
const ejs = require('ejs');
const opn = require('opn');

const inputFile = 'n26.csv';

const lines = [];

const processLine = (line) => {
    lines.push(line);
    return Promise.resolve();
};

const parser = parse({delimiter: ','}, (err, data) => {
    async.eachSeries(data, (line, callback) => {
        processLine(line).then(() => {
            callback();
        });
    }, () => {
        const months = lines
            .filter(line => !line[1].includes('Main Account'))
            .filter(line => line[0] !== 'Date')
            .reduce((acc, line) => {
                const date = line[0].substring(0, 10);
                const amount = +line[6];
                if (acc.some(m => m.name === date)) {
                    const mo = acc.find(m => m.name === date);
                    mo.sum += amount
                } else {
                    acc.push({
                        name: date,
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
                    sum: acc[idx - 1].sum + mo.sum
                });
            }
            return acc;

        }, []);

        const dates = monthsAbs.map(l => l.name);
        const sums = monthsAbs.map(l => l.sum);

        fs.outputJsonSync('./out/dates.json', dates);
        fs.outputJsonSync('./out/sums.json', sums);

        console.log('This should be the current amount on your account: ', sum);

        ejs.renderFile('./templates/index.html.dist', {dates, sums}, null, (err, html) => {
            if (err) {
                console.error(err);
                throw new Error(err);
            }
            fs.outputFileSync('./public/index.html', html)
            opn('./public/index.html');
        });

    })
});
fs.createReadStream(inputFile).pipe(parser);
