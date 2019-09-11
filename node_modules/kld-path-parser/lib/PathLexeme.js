/**
 *  PathLexeme.js
 *
 *  @copyright 2002, 2013 Kevin Lindsey
 *  @module PathLexeme
 */

/**
 *  PathLexeme
 */
class PathLexeme {
    /**
     *  PathLexeme
     *
     *  @param {number} type
     *  @param {string} text
     */
    constructor(type, text) {
        this.type = type;
        this.text = text;
    }

    /**
     *  Determine if this lexeme is of the given type
     *
     *  @param {number} type
     *  @returns {boolean}
     */
    typeis(type) {
        return this.type === type;
    }
}

/*
 * token type enumerations
 */
PathLexeme.UNDEFINED = 0;
PathLexeme.COMMAND = 1;
PathLexeme.NUMBER = 2;
PathLexeme.EOD = 3;

export default PathLexeme;
