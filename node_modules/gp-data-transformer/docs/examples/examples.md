- [Reverse key/values in object](#reverse-keyvalues-in-object)
- [List Property Types](#list-property-types)

---

# Reverse key/values in object

Some key features of this example:

- Uses `keys` to extract the keys of an object
- Uses `values` to extract the values of an object
- Uses `zip` to combine the keys and values into an array of pairs
- Uses `map` to convert the pairs into separate objects, with key/values reversed
- Uses `merge` to make one object out of all of the mapped objects
- Uses `pairs` function to replace the `keys`, `values`, and `zip` steps
- Uses `reverse` to reverse each element in the array of pairs
- Uses `fromPairs` to build an object from the list of key/value pairs

## Sample Data

For this example, we'll assume we have a JSON file named `reverse-key-values.json` with the following content:

```JSON
{ "one": "un", "two": "deux", "three": "trois" }
```

## Create an array of keys and values

```bash
cat reverse-key-values.json | dt '[keys,values]' -i
```

```
[ [ 'one', 'two', 'three' ], [ 'un', 'deux', 'trois' ] ]
```

## Zip keys and values

Each element in the resulting array is a 2-element array where the first element is the key and the second element is the value.

```bash
cat reverse-key-values.json | dt 'zip([keys,values])' -i
```

```
[ [ 'one', 'un' ], [ 'two', 'deux' ], [ 'three', 'trois' ] ]
```

## Convert zip elements to objects

Now we convert each element in the zipped array into objects, with key/values reversed

```bash
cat reverse-key-values.json | dt 'map(zip([keys,values]), { $.1 : $.0 })' -i
```

```
[ { un: 'one' }, { deux: 'two' }, { trois: 'three' } ]
```

## Merge objects into one

`map` returns an array but `merge` needs each object to be a separate parameter. We can convert the array to parameters using the spread (...) operator.

```bash
cat reverse-key-values.json | dt 'merge(...map(zip([keys,values]), { $.1 : $.0 }))' -i
```

```
{ un: 'one', deux: 'two', trois: 'three' }
```

## Alternate implementations

Alternately, we can generate the array of key/value pairs using the `pairs` functions.

```bash
cat reverse-key-values.json | dt 'merge(...map(pairs, { $[1]: $[0] }))' -i
```

```
{ un: 'one', deux: 'two', trois: 'three' }
```

As another alternate, we can use `pairs`, `reverse`, and `fromPairs`.

```bash
cat reverse-key-values.json | dt 'fromPairs(map(pairs, reverse))' -i
```

```
{ un: 'one', deux: 'two', trois: 'three' }
```

# List Property Types

## Sample Data

For this example, we'll assume we have a JSON file named `property-types.json` with the following content:

```JSON
{
  "name": "Test",
  "processed": true,
  "results": [1, 2, 3, 4, 5],
  "count": 5
  "nested" : {
    "a": 10
  },
  "more": null
}
```

## List keys and property types

```bash
cat "property-types.json" | dt '[keys, map(values, typeName)]' -i
```

```
[ [ 'name', 'processed', 'results', 'count', 'nested', 'more' ],
  [ 'string', 'boolean', 'array', 'number', 'object', 'null' ] ]
```

## Combine keys and property types into object

```bash
cat "property-types.json" | dt 'fromPairs(zip([keys, map(values, typeName)]))' -i
``` 

```
{ name: 'string',
  processed: 'boolean',
  results: 'array',
  count: 'number',
  nested: 'object',
  more: 'null' }
```
