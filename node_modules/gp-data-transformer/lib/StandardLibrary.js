// General functions

/**
 * Return the type name of the specified item
 *
 * @param {*} item
 * @returns {string}
 */
export function typeName(item) {
    switch (item) {
        case null:
            return "null";
        case undefined:
            return "undefined";
        default:
            if (Array.isArray(item)) {
                return "array";
            }

            return typeof item;
    }
}

// Array related functions

/**
 * Return the length of an array
 *
 * @param {Array} list
 * @returns {number}
 */
export function length(list) { /* eslint-disable-line no-shadow */
    return (Array.isArray(list)) ? list.length : 0;
}

/**
 * Combine multiple arrays into a single array
 *
 * @param {Array<Array>} lists
 * @param {*} [missing=undefined]
 * @returns {Array}
 */
export function zip(lists, missing = undefined) {
    const result = [];

    if (Array.isArray(lists) && lists.length > 0 && lists.every(l => Array.isArray(l))) {
        const maxLength = Math.max(...lists.map(l => l.length));

        for (let i = 0; i < maxLength; i++) {
            const part = [];

            for (const list of lists) {
                part.push(i < list.length ? list[i] : missing);
            }

            result.push(part);
        }
    }


    return result;
}

/**
 * Partition an array into multiple arrays
 *
 * @param {Array} items
 * @param {number} count
 * @param {number} advance
 * @param {*} [missing=undefined]
 */
export function partition(items, count, advance, missing = undefined) {
    /* eslint-disable-next-line no-shadow */
    const {length} = items;
    const result = [];

    // default advance to count, if its not defined
    advance = advance === undefined ? count : advance;

    // we can't advance backwards and we always need to advance
    count = Math.max(1, count);
    advance = Math.max(1, advance);

    for (let i = 0; i < length; i += advance) {
        const part = [];
        let index = i;

        for (let j = 0; j < count; j++, index++) {
            part.push(index < length ? items[index] : missing);
        }

        result.push(part);
    }

    return result;
}

/**
 * Return a new array with the original array's content reversed
 *
 * @param {Array} items
 * @returns {Array|undefined}
 */
export function reverse(items) {
    return Array.isArray(items)
        ? items.slice().reverse()
        : undefined;
}

/**
 * Return a new sorted array
 *
 * @param {Array} items
 * @param {Function} comparator
 * @returns {Array|undefined}
 */
export function sort(items, comparator) {
    return Array.isArray(items)
        ? items.slice().sort(comparator)
        : undefined;
}

/**
 * Return a string by concatenating a list of strings, delimiting each with another string
 *
 * @param {Array<string>} items
 * @param {string} delimiter
 * @returns {string}
 */
export function join(items, delimiter) {
    return items.join(delimiter);
}

// Object related functions

/**
 * Predicate to determine if an item is an object
 *
 * @param {*} item
 * @returns {boolean}
 */
function isObject(item) {
    return item !== null && typeof item === "object";
}

/**
 * Return a list of keys from an object
 *
 * @param {Object} item
 * @returns {string[]}
 */
export function keys(item) {
    /* eslint-disable-next-line compat/compat */
    return isObject(item) ? Object.keys(item) : [];
}

/**
 * Return a list of values from an object
 *
 * @param {Object} item
 * @returns {any[]}
 */
export function values(item) {
    /* eslint-disable-next-line compat/compat */
    return isObject(item) ? Object.values(item) : [];
}

/**
 * Return a list of key/value pairs from an object. Each element in the result is a 2-element array
 * where the first element is the key and the second element is the value
 *
 * @param {Object} item
 * @returns {Array<Array>}
 */
export function pairs(item) {
    /* eslint-disable-next-line compat/compat */
    return isObject(item) ? Object.entries(item) : [];
}

/**
 * Convert a list of key/value pairs into an object. This is the reverse of pairs
 *
 * @param {Array<Array>} pairs
 * @returns {Object}
 */
export function fromPairs(pairs) { /* eslint-disable-line no-shadow */
    const result = {};

    if (Array.isArray(pairs)) {
        for (const pair of pairs) {
            if (pair.length >= 2) {
                const [key, value] = pair;

                result[key] = value;
            }
        }
    }

    return result;
}

// Array and Object related

/**
 * If all items are objects, a new object with all the properties of all objects will be merged. If the same property
 * exists on multiple objects, the last object with that property wins.
 *
 * If the first item is an array, a new array will be created by appending all non-array items and concatenating all
 * array items.
 *
 * @param {Object|Array} items
 * @returns {Object|Array|undefined}
 */
export function merge(...items) {
    if (items.length > 0 && Array.isArray(items[0])) {
        return items[0].concat(...items.slice(1));
    }
    else if (items.every(item => isObject(item))) {
        return Object.assign({}, ...items);
    }

    return undefined;
}
