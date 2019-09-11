/**
 *  PathLexer.js
 *
 *  @copyright 2003, 2013 Kevin Lindsey
 *  @module PathLexer
 */

import PathLexeme from "./PathLexeme.js";

/**
 *  Create a new instance of PathLexer
 */
class PathLexer {
    /**
     *  @param {string} [pathData]
     */
    constructor(pathData) {
        if (pathData === null || pathData === undefined) {
            pathData = "";
        }

        this.setPathData(pathData);
    }

    /**
     *  setPathData
     *
     *  @param {string} pathData
     */
    setPathData(pathData) {
        if (typeof pathData !== "string") {
            throw new TypeError("The first parameter must be a string");
        }

        this._pathData = pathData;
    }

    /**
     *  getNextToken
     *
     *  @returns {PathLexeme}
     */
    getNextToken() {
        let result = null;
        let d = this._pathData;

        while (result === null) {
            if (d === null || d === "") {
                result = new PathLexeme(PathLexeme.EOD, "");
            }
            else if (d.match(/^([ \t\r\n,]+)/)) {
                d = d.substr(RegExp.$1.length);
            }
            else if (d.match(/^([AaCcHhLlMmQqSsTtVvZz])/)) {
                result = new PathLexeme(PathLexeme.COMMAND, RegExp.$1);
                d = d.substr(RegExp.$1.length);
            }
            /* eslint-disable-next-line unicorn/no-unsafe-regex */
            else if (d.match(/^(([-+]?\d+(\.\d*)?|[-+]?\.\d+)([eE][-+]?\d+)?)/)) {
                result = new PathLexeme(PathLexeme.NUMBER, RegExp.$1);
                d = d.substr(RegExp.$1.length);
            }
            else {
                throw new SyntaxError(`Unrecognized path data: ${d}`);
            }
        }

        this._pathData = d;

        return result;
    }
}

export default PathLexer;
