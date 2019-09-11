# Guide

- [Sequences](#sequences)
    - [Data Flow](data-flow)
    - [Identity Step](#identity-step)
- [Pattern Matchers](#pattern-matchers)
    - [Primitive Patterns](#primitive-patterns)
        - [Array Type Pattern](#array-type-pattern)
        - [Boolean and Boolean Type Patterns](#boolean-and-boolean-type-patterns)
        - [Number and Number Type Patterns](#number-and-number-type-patterns)
        - [Object Type Pattern](#object-type-pattern)
        - [String and String Type Patterns](#string-and-string-type-patterns)
        - [Special Values](#special-values)
    - [Compound Patterns](#compound-patterns)
        - [Array Patterns](#array-patterns)
        - [Object Patterns](#object-patterns)
    - [Captures](#captures)
- [Expressions](#expressions)
    - [Array Expressions](#array-expressions)
    - [Object Expressions](#object-expressions)
- [Naming Sequences](#naming-sequences)
- [Operators and Functions](#operators-and-functions)
    - [Repetition Operator](#repetition-operator)
    - [Standard Library](#standard-library)
    - [User-defined Functions](#user-defined-functions)
- [Grammar](#grammar)

---

This guide will gives a quick overview of the structure of the data transform scripting language. Note that the `dt` command-line tool will be used to demonstrate concepts, but all of these examples could be performed in code using this module directly.

# Sequences

The heart of a data transform script is the transform sequence. Sequences allow you to process data in stages. Each stage may be one of the following:

- A pattern match
- An expression
- A variable assignment
- A patterns block
- A sequences block

A sequence may consist of a single step from the above list. However, if more than step is used, each step must be delimited by the `|>` operator. 

```
step |> step
```

## Data Flow

Data flows from the left to the right, or from step to step. Each step's data is referred to as the current structure. The first step's current structure is the data passed into script. Each step may process its incoming structure or generate a new structure, or some combination of the two.

- We begin with some data on the right.
- The data flows into the pattern matcher which extracts key elements from the data. These key elements are named and become the result of the pattern.
- The generator receives a dictionary of captured items created by the pattern matcher. It constructs a new data structure, using a mixture of static content and captured values.
- The structure output by the generator becomes the resulting value of the transform

## Identity Step

The simplest sequence has a single step that does nothing to its current structure. The special symbol '$' refers to the current structure and can be used as the return value for that step. This can be referred to as an identity step.

```
echo '{"a": 10}' | dt '$'
# results: {"a": 10}
```

# Pattern Matchers

The purpose of a pattern matcher is to compare its pattern against its current structure. If the pattern matches the current structure, then the pattern succeeds. If the pattern does not match, it reports failure. Each pattern begins with the `=~` symbol.

## Primitive Patterns

The simplest patterns are the primitive patterns. These match entire classes of values or specific values of primitives. The next sections step through each of the available primitive patterns.

### Array Type Pattern

The `array` pattern 

```bash
echo '[1, 2, 3]' | dt '=~ array'
# returns [1, 2, 3]

echo '{"a": 10}' | dt '=~ array'
# fails
```

We can match specific array structures, which will be covered in [Compound Patterns]](#compound-patterns).

### Boolean and Boolean Type Patterns

Like the `array` pattern, we can match any boolean value using `boolean`

```bash
echo 'true' | dt '=~ boolean'
# returns true

echo 'false' | dt '=~ boolean'
# returns false

echo '[true]' | dt '=~ boolean'
# fails
```

In cases where you want to match a specific boolean value, you can use `true` and `false` directly

```bash
echo 'true' | dt '=~ true'
# returns true

echo 'false' | dt '=~ true'
# fails

echo '[true]' | dt '=~ true'
# fails
```

### Number and Number Type Patterns

We can match any number with `number` or specific numbers by using the number itself as the pattern.

```bash
echo '10' | dt '=~ number'
# returns 10

echo 'true' | dt '=~ number'
# fails

echo '3.14' | dt '=~ 3.14'
# returns 3.14

echo '"pi"' | dt '=~ 3.14'
# fails
```

### Object Type Pattern

If we want to know if a given piece of data is an object, we can use the `object` pattern. Note that this test will return true when matching against Javascript objects and arrays because they each can have properties. Also note that Javascript will return "object" when using `typeof` on `null`. This pattern will fail against `null`.

```bash
echo '{"a": true}' | dt '=~ object'
# returns {"a": true}

echo '[true]' | dt '=~ object'
# returns [true]

echo 'null' | dt '=~ object'
# fails

echo '10' | dt '=~ object'
# fails
```

### String and String Type Patterns

We can match any string with `string` or a specific string by using the string itself.

```bash
echo '"test"' | dt '=~ string'
# returns "test"

echo 'true' | dt '=~ string'
# fails

echo '"name"' | dt '=~ "name"'
# returns "name"

echo '"last"' | dt '=~ "name"'
# fails
```

### Special Values

It is possible to match `null` using the `null` pattern and to match `undefined` using the `undefined` pattern.

```bash
echo 'null' | dt '=~ null'
# returns null

echo 'undefined' | dt '=~ null'
# fails

echo 'undefined' | dt '=~ undefined'
# returns undefined

echo 'null' | dt '=~ undefined'
# fails
```

Sometimes you don't care about the type of the data you are matching. In these cases you can use `any` to match anything.

```bash
echo 'null' | dt '=~ any'
# returns null

echo 'undefined' | dt '=~ any'
# returns undefined

echo 'true' | dt '=~ any'
# returns true

echo '[1, 2, 3]' | dt '=~ any'
# returns [1, 2, 3[

echo '{"a": true}' | dt '=~ any'
# returns {"a": true}
```

## Compound Patterns

### Array Patterns

An array pattern is simply a comma-delimited list of other patterns (can be primitive our more compound patterns) surrounded by square brackets.

```bash
echo '[]' | dt '=~ []'
# returns {}

echo '[1]' | dt '=~ []'
# fails

echo '[1]' | dt '=~ [number]'
# returns {}

echo '[1, 2]' | dt '=~ [number]'
# fails
```

One thing you may notice is that the number of patterns and the number of items in the current object need to be the same. You may not always know the exact number, but you may know a range of acceptable values. You can use the repetition operator to indicate these ranges:

```bash
echo '[]' | dt '=~ [number; 1..2]'
# fails

echo '[1]' | dt '=~ [number; 1..2]'
# returns {}

echo '[1, 2]' | dt '=~ [number; 1..2]'
# returns {}

echo '[1, 2, 3]' | dt '=~ [number; 1..2]'
# fails
```

Any element pattern can have it's own repetition

```bash
echo '[10, "hello"]' | dt '=~ [number; 1..2, string; 1..2]'
# returns {}

echo '[10, 20, "hello"]' | dt '=~ [number; 1..2, string; 1..2]'
# returns {}

echo '[10, 20, "hello", "world"]' | dt '=~ [number; 1..2, string; 1..2]'
# returns {}

echo '[10, 20, 30, "hello", "world"]' | dt '=~ [number; 1..2, string; 1..2]'
# fails

echo '[10, 20, "hello", "world", "!"]' | dt '=~ [number; 1..2, string; 1..2]'
# fails
```

If you have a repeating sequence of types, you can group elements using parentheses

```bash
echo '[]' | dt '=~ [(number, string); 1..2]'
# fails

echo '[10, "hello"]' | dt '=~ [(number, string); 1..2]'
# returns {}

echo '[10, "hello", 20, "world"]' | dt '=~ [(number, string); 1..2]'
# returns {}

echo '[10, "hello", 20, "world", 30, "!"]' | dt '=~ [(number, string); 1..2]'
# fails
```

### Object Patterns

An object pattern is a comma-delimited list of key/value pairs. The key is a property name and the value is a pattern (can be primitive our more compound patterns) surrounded by curly braces.

```bash
echo '{}' | dt '=~ {}'
# returns {}

echo '{"a": true}' | dt '=~ {}'
# returns {"a": true}

echo '{"a": true}' | dt '=~ {a: boolean}'
# returns {}

echo '{"a": true}' | dt '=~ {a: number}'
# fails

echo '{"a": 10}' | dt '=~ {a: boolean}'
# fails

echo '{"a": true, "b": 10}' | dt '=~ {a: boolean}'
# returns {}
```

The last example may be a little surprising. This shows that an object pattern is only concerned with what it is looking for, `a` in this case. If the current object has other properties, that won't change the result of the match.

> Honestly, I'm a little on the fence about this. Everywhere else in the language, matches are strict, but they're not here. That seems inconsistent. Perhaps there could be a way to indicate strict matching versus the current loose matching. It seems like both could be useful.

## Captures

In the [Array Type Pattern](#array-type-pattern) section, we showed a way to return the input data when using the identity pattern. This used a mechanism referred to as capturing.

When a pattern successfully matches the current object, it returns a dictionary. You most likely noticed that all of our pattern matches returned `{}`. This is the empty dictionary. We use captures to place items into that dictionary, to give our generators access to the data that was captured.

```bash
echo '[1, 2]' | dt '=~ [number as a, number] |> a'
# returns 1

echo '{"first": 10, "second": 20}' | dt '=~ {first: number as a} |> a'
# returns 10

echo '[1, 2]' | dt '=~ [number, number] as a |> a'
# returns [1, 2]

echo '{"first": 10, "second": 20}' | dt '=~ {first: number} as a |> a'
# returns { first: 10, second: 20 }
```

Notice that we can extract specific elements of an array, specific property values of an object, or entire structures. Although its not shown here, we can capture as many items as we wish as long as each capture name is unique. You will get warnings if you accidentally capture the same name more than once. Capturing is what make generators work, which we'll talk about next.

### Captures in Arrays

Arrays give all sorts of options for capturing and building intermediate structures for your generators. Below is a wide array of examples.

```bash
echo '[10]' | dt '=~ [ number as n3 ]'
# returns { n3: 10 }

echo '[10,20]' | dt '=~ [ number; 2 as n3 ]'
# returns { n3: [ 10, 20 ] }

echo '[10,20,30,40]' | dt '=~ [ (number; 2, number; 2) as n3 ]'
# returns { n3: [ 10, 20, 30, 40 ] }

echo '[10,20,30,40,50,60,70,80]' | dt '=~ [ (number; 2, number; 2); 2 as n3 ]'
# returns { n3: [ [ 10, 20, 30, 40 ], [ 50, 60, 70, 80 ] ] }

echo '[10,20]' | dt '=~ [ (number as n1, number as n2) ]'
# returns { n1: 10, n2: 20 }

echo '[10,20,30,40]' | dt '=~ [ (number as n1, number as n2); 2 ]'
# returns { n1: [ 10, 30 ], n2: [ 20, 40 ] }

echo '[10,20]' | dt '=~ [ (number as n1, number as n2) as n3 ]'
# returns { n1: 10, n2: 20, n3: [ 10, 20 ] }

echo '[10,20,30,40]' | dt '=~ [ (number as n1, number as n2); 2 as n3 ]'
# returns { n1: [ 10, 30 ],
#   n2: [ 20, 40 ],
#   n3: [ [ 10, 20 ], [ 30, 40 ] ] }

echo '[10,20,30,40]' | dt '=~ [ (number; 2 as n1, number; 2 as n2) ]'
# returns { n1: [ 10, 20 ], n2: [ 30, 40 ] }

echo '[10,20,30,40,50,60,70,80]' | dt '=~ [ (number; 2 as n1, number; 2 as n2); 2 ]'
# returns { n1: [ [ 10, 20 ], [ 50, 60 ] ],
#   n2: [ [ 30, 40 ], [ 70, 80 ] ] }

echo '[10,20,30,40]' | dt '=~ [ (number; 2 as n1, number; 2 as n2) as n3 ]'
# returns { n1: [ 10, 20 ], n2: [ 30, 40 ], n3: [ 10, 20, 30, 40 ] }

echo '[10,20,30,40,50,60,70,80]' | dt '=~ [ (number; 2 as n1, number; 2 as n2); 2 as n3 ]'
# returns { n1: [ [ 10, 20 ], [ 50, 60 ] ],
#   n2: [ [ 30, 40 ], [ 70, 80 ] ],
#   n3: [ [ 10, 20, 30, 40 ], [ 50, 60, 70, 80 ] ] }
```

# Expressions

## Primitive Expressions

Primitive generators ignore their input and simply return themselves:

```bash
echo '{}' | dt 'true'
# returns true

echo '10' | dt 'false'
# returns false

echo '{}' | dt '6.28'
# returns 6.28

echo 'undefined' | dt '"test"'
# returns "test"

echo 'true' | dt 'null'
# returns null

echo '[]' | dt 'undefined'
# returns `undefined`
```

## Array Expressions

You can construct array structures using an array generator. Simply surround a comma-delimited list of generator expression in square brackets.

```bash
echo 'null' | dt '[]'
# returns []

echo 'null' | dt '[1, 2, 3]'
# returns [1, 2, 3]
```

You may notice that we are generating new arrays, but all of the content is static. A more interesting transform would use values from the pattern match. This is where captures come into play.

```bash
echo '[10, 20, 30]' | dt '=~ [number as first, number, number as third] |> [first, third]'
# returns [10, 30]

echo '{"a": 10, "b": 20, "c": 30}' | dt '=~ { a: number as first, b: number, c: number as third } |> [first, third]'
# returns [10, 30]
```

As you can see, we label matched data in a pattern (capture) and then we can reference the name of that capture in our generator (`first` and `third` in these examples).

## Object Expressions

You can construct object structures using an object generator. You wrap a list of comma-delimited properties in curly braces. The properties consist of a name and a value, where the name is the property name you wish to create and the value is another generator.

```bash
echo 'null' | dt '{"a": 10, "b": 20}'
# returns { a: 10, b: 20 }
```

Like our array generator examples, things get more interesting when we use patterns with captures.

```bash
echo '[10, 20, 30]' | dt '=~ [number as first, number, number as third]
    |> {"first": first, "third": third}'
# returns { first: 10, third: 30 }

echo '{"a": 10, "b": 20, "c": 30}' | dt '=~ { a: number as first, b: number, c: number as third }
    |> {"a": first, "b": third}'
# returns { a: 10, b: 30 }
```

If your property name and the capture you wish to use are the same, you can list the name by itself without the value.

```bash
echo '[10, 20, 30]' | dt '=~ [number as first, number, number as third] |> {"first", "third"}'
# returns { first: 10, third: 30 }
```

## Simple Operators

There is a limited set of operations that can be performed on data inside of an expression:

- addition with numbers only
- subtraction with numbers only
- multiplication with numbers only
- division with numbers only
- grouping calculations using parentheses
- property lookup
    - property "names" can be numbers too which acts like array indexing
- array index lookup
    - can use negative values to access elements from the end of the array

This list will be expanded over time.

# Naming Sequences

If you find yourself needing to re-use a sequence you can store these items in the environment and access them later by name.

```
def Number = =~ number as n |> n 
```

This sequence can be used in any location where a sequence is valid simply by using its name

```
dt '10 |> Number'
```

# Operators and Functions

## Repetition Operator

The repetition operator was introduced in the section on [Array Patterns](#array-patterns). We showed only one version of that operator. It turns out there are more options available. Below is a list of all syntactical versions of the reptition operator.

- Exactly n: ```;n```
- n or more: ```;n..```
- 0 to m: ```;..m```
- n to m: ```;n..m```

## Standard Library

Each transform is pre-populated with a list of functions from the standard library. To learn more about these functions, see the [Standard Library](#standard-library.md) document.

## User-defined Functions

The data-transform language is purposely limited. There will be times when you'll be unable to generate a structure simply because the language does not give you constructs to manipulate and massage the data as you need. At other times, you may need to create specific instances of classes or perform actions outside the functionality of this scripting language. User-defined functions allow you cover these cases.

First, you'll need to define a module that exports functions you wish to have available in your script. We'll use the following and name it MyGen.js.

```javascript
export function MyGen(x, y) {
    return { x, y, s: x + y, d: x - y };
}
```

Next, we let `dt` know to load this module and now any generators that use `MyGen` will end up calling this code.

```bash
echo '{"center": {"cx": 10, "cy": 20}}' | dt -r MyGen.js '=~ { center: { cx: number as x, cy: number as y } } |> MyGen(x, y)'
# returns { x: 10, y: 20, s: 30, d: -10 }
```

# Grammar

For those of you who are curious, the grammar has been extracted into a file for easy viewing:

- [Grammar](grammar.md)
