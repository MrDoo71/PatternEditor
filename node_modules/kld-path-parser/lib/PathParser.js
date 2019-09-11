/**
 *  PathParser.js
 *
 *  @copyright 2003, 2017 Kevin Lindsey
 *  @module PathParser
 */

import PathLexer from "./PathLexer.js";
import PathLexeme from "./PathLexeme.js";

const BOP = "BOP";

/**
 *  PathParser
 */
class PathParser {
    /**
     * constructor
     */
    constructor() {
        this._lexer = new PathLexer();
        this._handler = null;
    }

    /**
     *  parseData
     *
     *  @param {string} pathData
     *  @throws {Error}
     */
    parseData(pathData) {
        if (typeof pathData !== "string") {
            throw new TypeError(`The first parameter must be a string: ${pathData}`);
        }

        // begin parse
        if (this._handler !== null && typeof this._handler.beginParse === "function") {
            this._handler.beginParse();
        }

        // pass the pathData to the lexer
        const lexer = this._lexer;

        lexer.setPathData(pathData);

        // set mode to signify new path - Beginning Of Path
        let mode = BOP;

        // Process all tokens
        let lastToken = null;
        let token = lexer.getNextToken();

        while (token.typeis(PathLexeme.EOD) === false) {
            let parameterCount;
            const params = [];

            // process current token
            switch (token.type) {
                case PathLexeme.COMMAND:
                    if (mode === BOP && token.text !== "M" && token.text !== "m") {
                        throw new SyntaxError(`New paths must begin with a moveto command. Found '${token.text}'`);
                    }

                    // Set new parsing mode
                    mode = token.text;

                    // Get count of numbers that must follow this command
                    parameterCount = PathParser.PARAMCOUNT[token.text.toUpperCase()];

                    // Advance past command token
                    token = lexer.getNextToken();
                    break;

                case PathLexeme.NUMBER:
                    // Most commands allow you to keep repeating parameters
                    // without specifying the command again.  We just assume
                    // that is the case and do nothing since the mode remains
                    // the same

                    if (mode === BOP) {
                        throw new SyntaxError(`New paths must begin with a moveto command. Found '${token.text}'`);
                    }
                    else {
                        parameterCount = PathParser.PARAMCOUNT[mode.toUpperCase()];
                    }
                    break;

                default:
                    throw new SyntaxError(`Unrecognized command type: ${token.type}`);
            }

            // Get parameters
            for (let i = 0; i < parameterCount; i++) {
                switch (token.type) {
                    case PathLexeme.COMMAND:
                        throw new SyntaxError(`Parameter must be a number. Found '${token.text}'`);

                    case PathLexeme.NUMBER:
                        // convert current parameter to a float and add to
                        // parameter list
                        params[i] = parseFloat(token.text);
                        break;

                    case PathLexeme.EOD:
                        throw new SyntaxError("Unexpected end of string");

                    default:
                        throw new SyntaxError(`Unrecognized parameter type. Found type '${token.type}'`);
                }

                token = lexer.getNextToken();
            }

            // fire handler
            if (this._handler !== null) {
                const handler = this._handler;
                const methodName = PathParser.METHODNAME[mode];

                // convert types for arcs
                if (mode === "a" || mode === "A") {
                    params[3] = params[3] !== 0;
                    params[4] = params[4] !== 0;
                }

                if (handler !== null && typeof handler[methodName] === "function") {
                    handler[methodName](...params);
                }
            }

            // Lineto's follow moveto when no command follows moveto params.  Go
            // ahead and set the mode just in case no command follows the moveto
            // command
            switch (mode) {
                case "M":
                    mode = "L";
                    break;
                case "m":
                    mode = "l";
                    break;
                case "Z":
                case "z":
                    mode = "BOP";
                    break;
                default:
                    // ignore for now
            }

            if (token === lastToken) {
                throw new SyntaxError(`Parser stalled on '${token.text}'`);
            }
            else {
                lastToken = token;
            }
        }

        // end parse
        if (this._handler !== null && typeof this._handler.endParse === "function") {
            this._handler.endParse();
        }
    }

    /**
     *  setHandler
     *
     *  @param {Object} handler
     */
    setHandler(handler) {
        this._handler = handler;
    }
}

/*
 * class constants
 */
PathParser.PARAMCOUNT = {
    A: 7,
    C: 6,
    H: 1,
    L: 2,
    M: 2,
    Q: 4,
    S: 4,
    T: 2,
    V: 1,
    Z: 0
};
PathParser.METHODNAME = {
    A: "arcAbs",
    a: "arcRel",
    C: "curvetoCubicAbs",
    c: "curvetoCubicRel",
    H: "linetoHorizontalAbs",
    h: "linetoHorizontalRel",
    L: "linetoAbs",
    l: "linetoRel",
    M: "movetoAbs",
    m: "movetoRel",
    Q: "curvetoQuadraticAbs",
    q: "curvetoQuadraticRel",
    S: "curvetoCubicSmoothAbs",
    s: "curvetoCubicSmoothRel",
    T: "curvetoQuadraticSmoothAbs",
    t: "curvetoQuadraticSmoothRel",
    V: "linetoVerticalAbs",
    v: "linetoVerticalRel",
    Z: "closePath",
    z: "closePath"
};

export default PathParser;
