#!/usr/bin/env node -r esm

import fs from "fs";
import path from "path";
import {Parser} from "jison";
import grammar from "../lib/GrammarTable.js";

const parser = new Parser(grammar);

// generate source, ready to be written to disk
const source = parser.generate();
const search = `
if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain (args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}`;
const replace = "export default parser;\n";
const result = source.replace(search, replace);

if (result !== source) {
    fs.writeFileSync(path.join(__dirname, "../lib/GeneratedParser.js"), result);
}
else {
    console.error("Unable to fix export");
    process.exit(1);
}
