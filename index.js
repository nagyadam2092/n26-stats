const fs = require('fs-extra');
const parse = require('csv-parse');
const async = require('async');
const ejs = require('ejs');
const opn = require('opn');

const inputFile = 'n26-csv-transactions_toty.csv';

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
        const rows = lines
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

        const sum = `Money difference between start end date: ${rows.reduce((acc, curr) => curr.sum ? acc + curr.sum : acc, 0)}`;
        const rowsAbs = rows.reduce((acc, row, idx) => {
            if (idx === 0) {
                acc.push(row);
            } else {
                acc.push({
                    ...row,
                    sum: acc[idx - 1].sum + row.sum
                });
            }
            return acc;
        }, []);

        const dates = rowsAbs.map(l => l.name);
        const sums = rowsAbs.map(l => l.sum);

        ejs.renderFile('./templates/index.html.dist', {dates, sums, sum}, null, (err, html) => {
            if (err) {
                console.error(err);
                throw new Error(err);
            }
            fs.outputFileSync('./public/index.html', html);
            opn('./public/index.html');
            console.log('A browser tab should open with your graph. If not, please open directly public/index.html .');
        });

    })
});
fs.createReadStream(inputFile).pipe(parser);
