#!/usr/bin/env node -r esm

import PathParser from "../lib/PathParser.js";
import SampleHandler from "../lib/SampleHandler.js";

const parser = new PathParser();
const pathData = "M40,70 Q50,150 90,90 T135,130 L160,70 C180,180 280,55 280,140 S400,110 290,100";

parser.setHandler(new SampleHandler());
parser.parseData(pathData);
