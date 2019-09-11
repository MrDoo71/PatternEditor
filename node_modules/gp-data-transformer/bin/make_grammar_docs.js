#!/usr/bin/env node -r esm

import fs from "fs";
import path from "path";
import grammar from "../lib/GrammarTable";

function collectGrammar() {
    const lines = [];

    for (const rule in grammar.bnf) {
        const alternations = grammar.bnf[rule];
        let first = true;

        lines.push(rule);

        for (const alternate of alternations) {
            const production = Array.isArray(alternate)
                ? alternate[0]
                : alternate;

            if (first) {
                lines.push(`  : ${production}`);
                first = false;
            }
            else {
                lines.push(`  | ${production}`);
            }
        }

        lines.push("  ;");
        lines.push("");
    }

    return lines;
}

const lines = collectGrammar();
lines.unshift("```bnf");
lines.push("```");

fs.writeFileSync(path.join(__dirname, "../docs/grammar.md"), lines.join("\n"));
