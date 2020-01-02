#!/usr/bin/env node

// Reads JSON from stdin and writes equivalent
// nicely-formatted JSON to stdout.

var stdin = process.stdin,
    stdout = process.stdout,
    input = "";

process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
    let chunk;
    // Use a loop to make sure we read all available data.
    while ((chunk = process.stdin.read()) !== null) {
        input+=chunk;
    }
});

  process.stdin.on('end', function () {
    var parsedData = JSON.parse(input),
        outputJSON = JSON.stringify(parsedData, null, 4);
    process.stdout.write(outputJSON);
    process.stdout.write('\n');
});

