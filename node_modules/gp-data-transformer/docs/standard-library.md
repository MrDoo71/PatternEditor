# General Functions

## typeName

```
dt 'typeName([])'
returns "array"
```

# Array Functions

## length

```
dt 'length(1, 2, 3)'
returns 3
```

## zip

```
dt 'let a = [1, 2, 3]; let b = [4, 5, 6]; zip([a, b])'
returns [ [ 1, 4 ], [ 2, 5 ], [ 3, 6 ] ]
```

## partition

```
dt 'let a = [1, 2, 3, 4, 5]; partition(a, 2)'
returns [ [ 1, 2 ], [ 3, 4 ], [ 5, undefined ] ]

dt 'let a = [1, 2, 3, 4, 5]; partition(a, 2, 1)'
returns [ [ 1, 2 ], [ 2, 3 ], [ 3, 4 ], [ 4, 5 ], [ 5, undefined ] ]

dt 'let a = [1, 2, 3, 4, 5]; partition(a, 2, 1, 0)'
returns [ [ 1, 2 ], [ 2, 3 ], [ 3, 4 ], [ 4, 5 ], [ 5, 0 ] ]
```

## reverse

```
dt 'let a = [1, 2, 3, 4, 5]; reverse(a)'
returns [ 5, 4, 3, 2, 1 ]
```

## sort

```
dt 'let a = [ 5, 1, 3, 4, 2 ]; sort(a)'
returns [ 1, 2, 3, 4, 5 ]
```

## join

```
dt 'let a = [ "a", "b", "c" ]; join(a, ":")'
returns "a:b:c"
```

# Object Functions

## keys

```
dt 'let a = {"a": 10, "b": 20, "c": 30}; keys(a)'
returns [ 'a', 'b', 'c' ]
```

## values

```
dt 'let a = {"a": 10, "b": 20, "c": 30}; values(a)'
returns [ 10, 20, 30 ]
```

## pairs

```
dt 'let a = {"a": 10, "b": 20, "c": 30}; pairs(a)'
returns [ [ 'a', 10 ], [ 'b', 20 ], [ 'c', 30 ] ]
```

## fromPairs

```
dt 'let a = [["a", 10], ["b", 20], ["c", 30]]; fromPairs(a)'
returns { a: 10, b: 20, c: 30 }
```

# Array and Objects Functions

## merge

```
dt 'let a = [1, 2]; let b = [3, 4]; let c = [5, 6]; merge(a, b, c)'
returns [ 1, 2, 3, 4, 5, 6 ]
```

```
dt 'let a = {"a": 1, "b": 2}; let b = {"c": 3, "d": 4}; let c = {"e": 5, "f": 6}; merge(a, b, c)'
returns { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }
```
