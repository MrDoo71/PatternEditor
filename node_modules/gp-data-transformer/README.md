# gp-data-transformer

- [Installation](#installation)
- [Importing](#importing)
- [Usage](#usage)
- [Command Line](#command-line)
- [Links and Related Projects](#links-and-related-projects)

---

gp-data-transformer defines a DSL (Domain Specific Language) used to transform acyclic Javascript data into other formats. Incoming data can be pattern matched, capturing key elements in the data, and then transformed into new structures, using the captured data and more. This is currently being used in [kld-intersections](https://github.com/thelonious/kld-intersections) to allow users to describe geometric shapes in a wide variety of formats.

Note that I'm using Jison as the DSL's parser. It does not give friendly errors and I apologize for that. Future versions of this library are likely to use another parsing infrastructure.

# Installation

```npm install gp-data-transformer```

# Importing

The following sections indicate how you can import the code for use in various environments.

## Node

```javascript
const {Transformer} = require("gp-data-transformer");
```

## Browsers

```html
<script src="./node_modules/gp-data-transformer/dist/index-umd.js"></script>
<script>
  var Transformer = GpDataTransformer.Transformer;
</script>
```

## Modern Browsers (ESM)

```javascript
import {Transformer} from './node_modules/gp-data-transformer/dist/index-esm.js';
```

## Bundlers

```javascript
import {Transformer} from "gp-data-transformer";
```

# Usage

We begin by defining a transformation file, which we'll save the text below as `ellipse.dt`:

```
def Ellipse = {
    center:
        patterns {
            { center: { x: number, y: number } },
            { center: [ number as x, number as y ] },
            { cx: number as x, cy: number as y },
            { centerX: number as x, centerY: number as y }
        } |> Point2D(x, y),
    radii:
         patterns {
            { radii: { x: number as rx, y: number as ry } },
            { radii: [ number as rx, number as ry ] },
            { rx: number, ry: number },
            { radiusX: number as rx, radiusY: number as ry }
         } |> Vector2D(rx, ry)
};
```

This script begins by describing the final shape of data we wish to have. In this case, our final data will be an object with two properties: center and radii. Center will be the result of calling a user-defined function named Point2D passing in two values: x and y. Likewise, radii will be a Vector2D using values rx and ry. The x and y values for center are captured from one of four pattern matches; the first of which succeeds determines the captured values for x and y and likewise for the Vector2D and its rx and ry arguments.

To use this script, we need to write a little Javascript:

```javascript
import fs from "fs";
import util from "util";
import {Transformer, FAILURE_VALUE} from "gp-data-transformer";

// create transformer and add some user-defined functions
const transformer = new Transformer();
transformer.addFunction("Point2D", (x, y) => { return {x, y} });
transformer.addFunction("Vector2D", (u, v) => { return {u, v} });

// load our transformation script
transformer.execute(fs.readFileSync("./ellipse.dt", "utf-8"));

// build a list of test data
const samples = [
    {cx: 10, cy: 20, rx: 30, ry: 40},
    {centerX: 10, centerY: 20, radiusX: 30, radiusY: 40},
    {cx: 10, cy: 20, radiusX: 30, radiusY: 40},
    {centerX: 10, centerY: 20, rx: 30, ry: 40},
    {center: {x: 10, y: 20}, rx: 30, ry: 40},
    {center: {x: 10, y: 20}, radii: {x: 30, y: 40}},
    {center: [10, 20], rx: 30, ry: 40},
    {center: [10, 20], radii: [30, 40]}
];

// process each sample
samples.forEach(sample => {
    const result = transformer.execute("Ellipse", sample);

    // transformer returns a special FAILURE_VALUE when there is an error
    if (result !== FAILURE_VALUE) {
        console.log(`${util.inspect(sample)} => ${util.inspect(result)}`);
    }
    else {
        console.log(`Failed to match ${util.inspect(sample)}`);
    }
    
    // show any warnings or errors
    for (const message of transformer.messages) {
        console.log(`${message.type}: ${message.message}`);
    }
});
```

The above code creates a new transform and adds user-defined functions for Point2D and Vector2D. A list of samples are processed showing the result upon successful processing or errors upon failure. The purpose of the this example is to normalize our incoming data, so all results should look the same:

```JSON
{ "center": { "x": 10, "y": 20 }, "radii": { "u": 30, "v": 40 } }
```

For a more in-depth description of the data-transform format, be sure to have a look at a [the Guide](docs/guide.md).

# Command Line

You can transform data from the command-line as well:

```bash
echo '{"a": 10}' | dt '$.a'
```

If your script needs to load functions into the environment, you can use the following:

```bash
echo '{"x": 10, "y": 20}' | dt -r affine.js 'Point2D($.x, $.y)'
```

All exported names in the affine.js module will be added as functions, using their exported names as the function names.

If your data is an array of test objects, you can add the `-a` option to test each element separately:

```bash
echo '[{"x": 10, "y": 20}, {"x": 30, "y": 40}]' | dt -a -r affine.js 'Point2D($.x, $.y)'
```

For comparison, if you wish to process the entire array in your script, you can use `map` to traverse the items of the array.

```bash
echo '[{"x": 10, "y": 20}, {"x": 30, "y": 40}]' | dt -r affine.js 'map($, Point2D($.x, $.y))'
```

# Links and Related Projects

- [Guide](docs/guide.md)
- [WIP]: [Standard Library](docs/standard-library.md)
- [Examples](docs/examples/examples.md)
- [JQ Tutorial](docs/jq-tutorial.md)
- [kld-intersections](https://github.com/thelonious/kld-intersections)
