"use strict";

module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true,
        "mocha": true
    },
    "extends": ["ash-nazg/sauron-node"],
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "overrides": [
        {
            files: "docs/jsdoc-config.js",
            globals: {
                "module": "readonly"
            },
            rules: {
                strict: "off",
                "import/unambiguous": "off",
                "import/no-commonjs": "off"
            }
        },
        {
            files: ["**/*.md"],
            rules: {
                "eol-last": "off",
                "no-console": "off",
                "no-undef": "off",
                "padded-blocks": "off",
                "import/unambiguous": "off",
                "import/no-unresolved": "off",
                "node/no-missing-import": "off"
            }
        }
    ],
    "rules": {
        "indent": [
            "error",
            4,
            {"SwitchCase": 1}
        ],
        "quotes": [
            "error",
            "double"
        ],
        "space-before-function-paren": [
            "error",
            "never"
        ],
        "brace-style": [
            "error",
            "stroustrup"
        ],
        "arrow-parens": [
            "error",
            "as-needed"
        ],
        "max-len": "off",
        "node/exports-style": "off",
        "require-unicode-regexp": "off",
        "yoda": "off",
        "valid-jsdoc": 0
    }
};
