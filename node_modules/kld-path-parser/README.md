# kld-path-parser

- [Installation](#installation)
- [Importing](#importing)
- [Usage](#usage)
- [Custom Handlers](#custom-handlers)

---

An event-driven SVG path data parser.

# Installation

```npm install kld-path-parser```

# Importing

The following sections indicate how you can import the code for use in various environments.

## Node

```javascript
import {PathParser, SampleHandler} = require("kld-path-parser");
```

## ESM in Modern Browsers

```javascript
import {PathParser, SampleHandler} from './node_modules/kld-path-parser/dist/index-esm.js';
```

## Older Browsers

```html
<script src="./node_modules/kld-path-parser/dist/index-umd.js"></script>
<script>
  var PathParser = KldPathParser.PathParser;
  var SampleHandler = KldPathParser.SampleHandler;
</script>
```

## Bundlers

```javascript
import {AffineShapes, Shapes, Intersection} from "kld-path-parser";
```

# Usage

```javascript
import {PathParser, SampleHandler} from "kld-path-parser";

const parser = new PathParser();
const handler = new SampleHandler());
const pathData = "M40,70 Q50,150 90,90 T135,130 L160,70 C180,180 280,55 280,140 S400,110 290,100";

parser.setHandler(handler);
parser.parseData(pathData);

console.log(handler.logs.join("\n"));
```

## Result

```
movetoAbs(40,70)
curvetoQuadraticAbs(50,150,90,90)
curvetoQuadraticSmoothAbs(135,130)
linetoAbs(160,70)
curvetoCubicAbs(180,180,280,55,280,140)
curvetoCubicSmoothAbs(400,110,290,100)
```

# Custom Handlers

When creating your own event handler, you will need to define methods for each event you wish to listen for. Below is a list of all events (method names) that may be fired during a parse.

- beginParse()
- endParse()
- arcAbs(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y)
- arcRel(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y)
- curvetoCubicAbs(x1, y1, x2, y2, x, y)
- curvetoCubicRel(x1, y1, x2, y2, x, y)
- linetoHorizontalAbs(x)
- linetoHorizontalRel(x)
- linetoAbs(x, y)
- linetoRel(x, y)
- movetoAbs(x, y)
- movetoRel(x, y)
- curvetoQuadraticAbs(x1, y1, x, y)
- curvetoQuadraticRel(x1, y1, x, y)
- curvetoCubicSmoothAbs(x2, y2, x, y)
- curvetoCubicSmoothRel(x2, y2, x, y)
- curvetoQuadraticSmoothAbs(x, y)
- curvetoQuadraticSmoothRel(x, y)
- linetoVerticalAbs(y)
- linetoVerticalRel(y)
- closePath()
