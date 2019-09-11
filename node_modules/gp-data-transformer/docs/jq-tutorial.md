This language was inspired and most likely influenced by [jq](https://stedolan.github.io/jq/). Out of curiosity, I was wondering if I could recreate the [jq Tutorial](https://stedolan.github.io/jq/tutorial/) in `dt`. Below is a `dt` version of that tutorial.

# Get Some Data

The `jq` tutorial redirects `curl` output to `jq`. `dt` works the same, but I'm going to redirect the `curl` output to a temporary file and use that file instead.

```bash
curl 'https://api.github.com/repos/stedolan/jq/commits?per_page=5' > temp.json
```

# Show Data

We can view what we downloaded using `cat`. We'll start each command the same way to feed that data to `dt`.

```bash
cat temp.json
```

# Pass Data Through Untouched

The `$` symbol refers to the current structure. In the example below, the current structure is the data being passed in from the `cat` command.

```bash
cat temp.json | dt '$'
```

# Extract first commit

We know that the structure we are receiving is an array. We can extract the first element of that array using `$[0]`. You may also use dot notation: `$.0`.

```bash
cat temp.json | dt '$[0]'
```

# Extract message and name from first element

We would like to extract the committer's name and the commit message. Since we are returning more than one value, we need some kind of composite data structure. We could return each value as an element of an array, but we return an object since its properties serve as a form of documentation for our return value.

```bash
cat temp.json | dt '{ "message": $[0].commit.message, "name": $[0].commit.committer.name }'
```

Each property uses dot notation, something that should be familiar to anyone coming from Javascript.

# Extract message and name from all elements

We'd like to extract the committer and commit message for all items in the array. `map` allows us to process each element of an array. The result will be a new array where each element is the processed result of the origin element.

```bash
cat temp.json | dt 'map($, { "message": $.commit.message, "name": $.commit.committer.name })'
```

Notice how the first argument to `map` is `$`. This refers the structure being passed into `dt`. The `$` in map's second argument refers to each element as it is being processed. That expression's current structure is the element being processed. 

# Get parents

Expressions can be nested. In this last example, we process an element's `parents` array, mapping the elements of that array to their `html_url` property.

```bash
cat temp.json | dt 'map($, { "message": $.commit.message, "name": $.commit.committer.name, "parents": map($.parents, $.html_url) })'
```
