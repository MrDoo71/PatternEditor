/**
 *  Transformer.jss
 *
 *  @copyright 2019, Kevin Lindsey
 *  @module Transformer
 */

// import util from "util";
// import Parser from "./Parser.js";
import Parser from "./GeneratedParser.js";
import * as StdLib from "./StandardLibrary.js";

const FAILURE_VALUE = {};
export {FAILURE_VALUE};

/**
 * Determine if object is something that can have properties
 *
 * @param {*} obj
 * @returns {boolean}
 */
function isObject(obj) {
    return obj !== null && typeof obj === "object";
}

/**
 * Transformer
 */
export default class Transformer {
    /**
     * Create a new empty Transformer. Normalizers can be used to validate and transform data. However, when a new
     * Transformer has been created, it needs to be populated with one or more type descriptions. The easiest way to do
     * this is with the static method fromSource.
     */
    constructor() {
        this.symbolTable = {};
        this.functions = {};
        this.messages = [];
        this.verbose = false;

        // add standard library
        /* eslint-disable-next-line guard-for-in */
        for (const name in StdLib) {
            /* eslint-disable-next-line import/namespace */
            this.functions[name] = StdLib[name];
        }
    }

    /**
     * Add function
     *
     * @param {string} name
     * @param {Function} reference
     */
    addFunction(name, reference) {
        // TODO: type check
        this.functions[name] = reference;
    }

    /**
     * Add information
     *
     * @param {string} message
     */
    addInfo(message) {
        if (this.verbose) {
            this.messages.push({type: "message", level: "info", message});
        }
    }

    /**
     * Add a warning
     *
     * @param {string} message
     */
    addWarning(message) {
        this.messages.push({type: "message", level: "warning", message});
    }

    /**
     * Add an error
     *
     * @param {string} message
     */
    addError(message) {
        this.messages.push({type: "message", level: "error", message});
    }

    /**
     * Compile and execute the source against the specfied structure
     *
     * @param {string} source
     * @param {*} structure
     * @returns {*}
     */
    execute(source, structure) {
        // TODO: cache results using source or source hash as key
        // parse source
        const statements = Parser.parse(source);

        // clear any previous messages
        this.messages = [];

        // process statements
        let result;

        for (const statement of statements) {
            switch (statement.type) {
                case "assignment":
                case "def":
                case "sequence": {
                    result = this.executeExpression(statement, structure, this.symbolTable);
                    break;
                }

                default:
                    this.addError(`unknown statement type: ${statement.type}`);
                    return FAILURE_VALUE;
            }
        }

        return result;
    }

    /*
     * Execute a method and return its value
     *
     * @param {object} expression
     * @param {object} symbolTable
     * @returns {*}
     */
    executeExpression(expression, structure, symbolTable) {
        const getNumbers = operation => {
            const left = this.executeExpression(expression.left, structure, symbolTable);

            if (left !== FAILURE_VALUE && typeof left === "number") {
                const right = this.executeExpression(expression.right, structure, symbolTable);

                if (right !== FAILURE_VALUE && typeof right === "number") {
                    return operation(left, right);
                }
            }

            return FAILURE_VALUE;
        };

        switch (expression.type) {
            case "assignment": {
                const value = this.executeExpression(expression.value, structure, symbolTable);

                if (value === FAILURE_VALUE) {
                    this.addError(`Unable to evaluate assignment value for ${expression.name}`);
                    return FAILURE_VALUE;
                }

                symbolTable[expression.name] = value;

                return value;
            }

            case "def":
                symbolTable[expression.name] = expression.value;
                return undefined;

            case "get-value":
                if (expression.name in symbolTable) {
                    const value = symbolTable[expression.name];

                    if (isObject(value) && value.type === "sequence") {
                        const seqValue = this.executeExpression(value, structure, symbolTable);

                        if (seqValue === FAILURE_VALUE) {
                            this.addError(`Unable to evaluate sequence ${expression.name}`);
                            return FAILURE_VALUE;
                        }

                        return seqValue;
                    }

                    return value;
                }
                else if (expression.name in this.functions) {
                    return this.invokeFunction(expression.name, [structure]);
                }

                this.addError(`Tried to access unbound symbol: ${expression.name}`);
                return FAILURE_VALUE;

            case "get-property": {
                const object = this.executeExpression(expression.left, structure, symbolTable);

                return (isObject(object)) ? object[expression.right] : FAILURE_VALUE;
            }

            case "get-index": {
                const {left, right} = expression;
                const array = this.executeExpression(left, structure, symbolTable);

                if (Array.isArray(array)) {
                    const index = (right < 0) ? array.length + right : right;

                    return 0 <= index && index < array.length ? array[index] : FAILURE_VALUE;
                }

                return FAILURE_VALUE;
            }

            case "get-structure":
                return structure;

            case "sequences": {
                let result = FAILURE_VALUE;

                for (const sequence of expression.sequences) {
                    const sequenceSymbolTable = Object.create(symbolTable);

                    result = this.executeExpression(sequence, structure, sequenceSymbolTable);

                    if (result !== FAILURE_VALUE) {
                        Object.assign(symbolTable, sequenceSymbolTable);
                        break;
                    }
                }

                return result;
            }

            case "sequence": {
                let currentObject = structure;

                for (const step of expression.steps) {
                    if (step.type === "pattern") {
                        currentObject = this.executePattern(step, currentObject, symbolTable);
                    }
                    else {
                        currentObject = this.executeExpression(step, currentObject, symbolTable);
                    }

                    if (currentObject === FAILURE_VALUE) {
                        return FAILURE_VALUE;
                    }
                }

                return currentObject;
            }

            case "add":
                return getNumbers((a, b) => a + b);

            case "map": {
                const [valueGenerator, transform] = expression.value;
                const values = this.executeExpression(valueGenerator, structure, symbolTable);

                if (values !== FAILURE_VALUE) {
                    if (Array.isArray(values) === false) {
                        this.addError("First argument of map must evaluate to an array");
                        return FAILURE_VALUE;
                    }

                    const mapSymbolTable = Object.create(symbolTable);

                    return values.map(value => this.executeExpression(transform, value, mapSymbolTable));
                }

                return FAILURE_VALUE;
            }

            case "patterns": {
                let result = FAILURE_VALUE;

                for (const pattern of expression.patterns) {
                    const patternSymbolTable = Object.create(symbolTable);

                    result = this.executePattern(pattern, structure, patternSymbolTable);

                    if (result !== FAILURE_VALUE) {
                        Object.assign(symbolTable, patternSymbolTable);
                        break;
                    }
                }

                return result;
            }

            case "subtract":
                return getNumbers((a, b) => a - b);

            case "multiply":
                return getNumbers((a, b) => a * b);

            case "divide":
                return getNumbers((a, b) => a / b);

            case "invoke": {
                const args = expression.args.reduce((accum, arg) => {
                    if (arg.type === "spread") {
                        const value = this.executeExpression(arg.expression, structure, symbolTable);
                        // const value = arg.name !== null ? symbolTable[arg.name] : structure;

                        if (Array.isArray(value)) {
                            accum = accum.concat(value);
                        }
                        else {
                            accum.push(value);
                        }
                    }
                    else {
                        accum.push(this.executeExpression(arg, structure, symbolTable));
                    }

                    return accum;
                }, []);

                if (expression.name in this.functions) {
                    return this.invokeFunction(expression.name, args);
                }

                this.addError(`Tried to access unbound symbol: ${expression.name}`);
                return FAILURE_VALUE;
            }

            case "array": {
                const results = [];

                for (const element of expression.value) {
                    if (element.type === "assignment") {
                        this.executeExpression(element, structure, symbolTable);
                    }
                    else {
                        const value = this.executeExpression(element, structure, symbolTable);

                        if (value === FAILURE_VALUE) {
                            return FAILURE_VALUE;
                        }

                        results.push(value);
                    }
                }

                return results;
            }

            case "boolean":
            case "null":
            case "number":
            case "string":
            case "undefined":
                return expression.value;

            case "object":
                return this.executeObjectExpression(expression, structure, symbolTable);

            default:
                this.addError(`Unrecognized expression type: '${expression.type}'`);
                return FAILURE_VALUE;
        }
    }

    /**
     * Execute an object pattern
     *
     * @param {Object} pattern
     * @param {*} structure
     * @param {Object} symbolTable
     * @returns {*}
     */
    executeObjectExpression(pattern, structure, symbolTable) {
        const objectSymbolTable = Object.create(symbolTable);
        const result = {};

        for (const element of pattern.value) {
            switch (element.type) {
                case "property": {
                    const name = this.executeExpression(element.name, structure, objectSymbolTable);

                    if (name === FAILURE_VALUE) {
                        return FAILURE_VALUE;
                    }
                    else if (typeof name !== "string") {
                        this.addError(`Property names must be string types: ${name}`);
                        return FAILURE_VALUE;
                    }

                    const value = element.value !== null
                        ? this.executeExpression(element.value, structure, objectSymbolTable)
                        : symbolTable[name];

                    if (value === FAILURE_VALUE) {
                        this.addError(`Unable to evaluate value for property ${name}`);
                        return FAILURE_VALUE;
                    }

                    result[name] = value;
                    break;
                }

                case "assignment": {
                    const value = this.executeExpression(element, structure, objectSymbolTable);

                    if (value === FAILURE_VALUE) {
                        return FAILURE_VALUE;
                    }
                    break;
                }

                default:
                    this.addError(`Unrecognized object expression element type: ${element.type}`);
                    return FAILURE_VALUE;
            }
        }

        return result;
    }

    /*
     * Acquire the value of a type pattern from the specified structure. Any named entities will be populated in the
     * specified symbolTable
     *
     * @param {object} pattern
     * @param {*} structure
     * @param {object} symbolTable
     * @returns {*}
     */
    executePattern(pattern, structure, symbolTable) {
        switch (pattern.patternType) {
            case "any":
                this.assign(symbolTable, pattern.assignTo, structure);
                return structure;

            case "array":
                if (Array.isArray(structure)) {
                    this.assign(symbolTable, pattern.assignTo, structure);
                    return structure;
                }

                return FAILURE_VALUE;

            case "array-pattern": {
                const result = this.executeArrayPattern(pattern, structure, symbolTable);

                return result === FAILURE_VALUE ? FAILURE_VALUE : symbolTable;
            }

            case "boolean":
                if (typeof structure === "boolean") {
                    if (pattern.value === null || pattern.value === structure) {
                        this.assign(symbolTable, pattern.assignTo, structure);
                        return structure;
                    }
                }

                return FAILURE_VALUE;

            case "null":
                if (structure === null) {
                    this.assign(symbolTable, pattern.assignTo, structure);
                    return structure;
                }

                return FAILURE_VALUE;

            case "number":
                if (typeof structure === "number") {
                    if (pattern.value === null || pattern.value === structure) {
                        this.assign(symbolTable, pattern.assignTo, structure);
                        return structure;
                    }
                }

                return FAILURE_VALUE;

            case "object":
                if (isObject(structure)) {
                    this.assign(symbolTable, pattern.assignTo, structure);
                    return structure;
                }

                return FAILURE_VALUE;

            case "object-pattern": {
                if (isObject(structure) === false) {
                    return FAILURE_VALUE;
                }

                const result = {};

                for (const property of pattern.value) {
                    const {name, pattern: propertyPattern, assignTo} = property;

                    if (name in structure) {
                        const value = this.executePattern(propertyPattern, structure[name], symbolTable);

                        if (value === FAILURE_VALUE) {
                            return FAILURE_VALUE;
                        }

                        this.assign(symbolTable, assignTo, structure[name]);
                        this.assign(result, assignTo, value);
                    }
                    else {
                        return FAILURE_VALUE;
                    }
                }

                this.assign(symbolTable, pattern.assignTo, structure);
                return result;
            }

            case "reference":
                if (pattern.value in this.patterns) {
                    const referencedPattern = this.patterns[pattern.value];
                    const result = this.executePattern(referencedPattern, structure, symbolTable);

                    if (result !== FAILURE_VALUE) {
                        this.assign(symbolTable, pattern.assignTo, result);
                    }

                    return result;
                }

                return FAILURE_VALUE;

            case "string":
                if (typeof structure === "string") {
                    if (pattern.value === null || pattern.value === structure) {
                        this.assign(symbolTable, pattern.assignTo, structure);
                        return structure;
                    }
                }

                return FAILURE_VALUE;

            case "undefined":
                // NOTE: Our current failure value is undefined, so this will be treated as an error. I can change
                // FAILURE_VALUE to be a sigil. I'll just have to be careful to return undefined at the top-most level.
                // I'm leaving this for now as this is probably not going to be used much
                if (structure === undefined) {
                    this.assign(symbolTable, pattern.assignTo, structure);
                    return structure;
                }

                return FAILURE_VALUE;

            default:
                throw new TypeError(`unrecognized pattern type: '${pattern.type}'`);
        }
    }

    /*
     * Execute an array pattern
     *
     * @param {Object} pattern
     * @param {*} structure
     * @param {Object} symbolTable
     * @returns {*}
     */
    executeArrayPattern(pattern, structure, symbolTable) {
        if (Array.isArray(structure) === false) {
            return FAILURE_VALUE;
        }

        let result = [];
        let index = 0;

        for (const element of pattern.value) {
            const results = this.executeArrayPatternElement(element, index, structure, symbolTable);

            if (results === FAILURE_VALUE) {
                return FAILURE_VALUE;
            }

            result = result.concat(results);
            index += results.length;
        }

        if (index === structure.length) {
            this.assign(symbolTable, pattern.assignTo, structure);
            return result;
        }

        return FAILURE_VALUE;
    }

    /*
     * Execute an element from an array pattern
     *
     * @param {Object} element
     * @param {number} index
     * @param {*} structure
     * @param {Object} symbolTable
     * @returns {Array|undefined}
     */
    executeArrayPatternElement(element, index, structure, symbolTable) {
        let result = [];

        switch (element.type) {
            case "element": {
                const results = this.executeArrayElementPattern(element, index, structure, symbolTable);

                if (results === FAILURE_VALUE) {
                    return FAILURE_VALUE;
                }

                result = result.concat(results);
                index += results.length;
                break;
            }

            case "element-group": {
                const results = this.executeArrayElementGroupPattern(element, index, structure, symbolTable);

                if (results === FAILURE_VALUE) {
                    return FAILURE_VALUE;
                }

                result = result.concat(results);
                index += results.length;
                break;
            }

            default:
                this.addError(`Unrecognized array pattern element type: '${element.type}'`);
                return FAILURE_VALUE;
        }

        return result;
    }

    /*
     * Execute array element pattern
     *
     * @param {Object} element
     * @param {number} index
     * @param {*} structure
     * @param {Object} symbolTable
     * @returns {Array|undefined}
     */
    executeArrayElementPattern(element, index, structure, symbolTable) {
        const {pattern, range: {start, stop}} = element;
        const result = [];

        for (let i = 0; i < stop; i++) {
            const actualIndex = index + i;

            // treat out-of-bounds like a failure
            const value = (actualIndex < structure.length)
                ? this.executePattern(pattern, structure[actualIndex], symbolTable)
                : FAILURE_VALUE;

            // if we processed enough, continue, else failure
            if (value === FAILURE_VALUE) {
                if (i >= start) {
                    break;
                }

                return FAILURE_VALUE;
            }

            // save result
            if (stop > 1) {
                this.pushAssign(symbolTable, element.assignTo, value);
            }
            else {
                this.assign(symbolTable, element.assignTo, value);
            }
            result.push(value);
        }

        return result;
    }

    /*
     * Execute array element group pattern
     *
     * @param {Object} element
     * @param {number} index
     * @param {*} structure
     * @param {Object} symbolTable
     * @returns {Array|undefined}
     */
    executeArrayElementGroupPattern(group, index, structure, symbolTable) {
        const {elements, range: {start, stop}} = group;
        let result = [];

        for (let i = 0; i < stop; i++) {
            let groupResults = [];

            // all elements must be successful
            for (const element of elements) {
                const elementSymbolTable = Object.create(symbolTable);
                const results = this.executeArrayPatternElement(element, index, structure, elementSymbolTable);

                if (results === FAILURE_VALUE) {
                    groupResults = FAILURE_VALUE;
                    break;
                }

                // copy result into main symbol table
                if (element.assignTo !== null && element.assignTo !== undefined && element.assignTo in elementSymbolTable) {
                    if (stop > 1) {
                        // this.pushAssign(symbolTable, element.assignTo, results);
                        this.pushAssign(symbolTable, element.assignTo, elementSymbolTable[element.assignTo]);
                    }
                    else {
                        // this.assign(symbolTable, element.assignTo, results);
                        this.assign(symbolTable, element.assignTo, elementSymbolTable[element.assignTo]);
                    }
                }

                // collect everything that matched and advance to the next item to match
                result = result.concat(results);
                index += results.length;

                // collect what we've matched in this group so far
                groupResults = groupResults.concat(results);
            }

            if (groupResults === FAILURE_VALUE) {
                // make sure we met our lower bounds criteria
                if (i >= start) {
                    // if we didn't process any elements, then we haven't created arrays in the symbol table for this
                    // group or its elements.
                    if (i === 0) {
                        this.assign(symbolTable, group.assignTo, []);

                        for (const element of elements) {
                            this.assign(symbolTable, element.assignTo, []);
                        }
                    }

                    return result;
                }

                return FAILURE_VALUE;
            }

            if (stop > 1) {
                this.pushAssign(symbolTable, group.assignTo, groupResults);
            }
            else {
                this.assign(symbolTable, group.assignTo, groupResults);
            }
        }

        return result;
    }

    /*
     * Invoke a user-defined method and return its value
     *
     * @param {string} type
     * @param {Array} args
     * @returns {*}
     */
    invokeFunction(type, args) {
        if (type in this.functions) {
            return this.functions[type](...args);
        }

        return FAILURE_VALUE;
    }

    /**
     * Add a symbol/value to the symbol table, warning if an overwrite is occurring
     *
     * @param {Object} symbolTable
     * @param {string} name
     * @param {*} value
     */
    assign(symbolTable, name, value) {
        if (name !== null && name !== undefined) {
            /* eslint-disable-next-line no-prototype-builtins */
            if (symbolTable.hasOwnProperty(name)) {
                this.addWarning(`Overwriting ${name} with value: ${value}`);
            }

            symbolTable[name] = value;
        }
    }

    /**
     * Push a value onto the array at the name in the symbol table. If the name is not in the table already, an array will
     * be created and then the value will be pushed to it. This is used for grouped elements.
     *
     * @param {Object} symbolTable
     * @param {string} name
     * @param {*} value
     */
    pushAssign(symbolTable, name, value) {
        if (name !== null && name !== undefined) {
            /* eslint-disable-next-line no-prototype-builtins */
            const items = symbolTable.hasOwnProperty(name)
                ? symbolTable[name]
                : [];

            if (Array.isArray(items)) {
                items.push(value);

                symbolTable[name] = items;
            }
            else {
                this.addWarning(`Unable to push to ${name} because it is not an array: ${items}`);
            }
        }
    }
}
