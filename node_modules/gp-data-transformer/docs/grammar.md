```bnf
program
  : statements
  | statements ;
  ;

statements
  : statements ; statement
  | statement
  ;

statement
  : assignment
  | sequence
  ;

assignment
  : LET IDENTIFIER = sequence
  | DEF IDENTIFIER = sequence
  ;

sequences
  : sequences , sequence
  | sequence
  ;

sequence
  : steps
  ;

steps
  : steps |> step
  | step
  ;

step
  : =~ namedPattern
  | expression
  ;

expression
  : mathExpression
  | MAP ( expression , sequence )
  | PATTERNS { patterns }
  | SEQUENCES { sequences }
  ;

mathExpression
  : callExpression
  | mathExpression + callExpression
  | mathExpression - callExpression
  | mathExpression * callExpression
  | mathExpression / callExpression
  ;

callExpression
  : IDENTIFIER ( )
  | IDENTIFIER ( argumentList )
  | memberExpression
  ;

memberExpression
  : primaryExpression
  | memberExpression . IDENTIFIER
  | memberExpression . integer
  | memberExpression [ integer ]
  ;

primaryExpression
  : boolean
  | NULL_TYPE
  | float
  | string
  | UNDEFINED_TYPE
  | IDENTIFIER
  | $
  | arrayExpression
  | objectExpression
  | ( expression )
  ;

arrayExpression
  : [ ]
  | [ expressionElements ]
  ;

expressionElements
  : expressionElements , expressionElement
  | expressionElement
  ;

expressionElement
  : expression
  | assignment
  ;

objectExpression
  : { }
  | { expressionProperties }
  ;

expressionProperties
  : expressionProperties , expressionProperty
  | expressionProperty
  ;

expressionProperty
  : expression : sequence
  | expression
  | assignment
  ;

argumentList
  : argumentList , argument
  | argument
  ;

argument
  : expression
  | ... expression
  ;

patterns
  : patterns , namedPattern
  | namedPattern
  ;

namedPattern
  : pattern
  | pattern AS IDENTIFIER
  ;

pattern
  : ANY_TYPE
  | ARRAY_TYPE
  | BOOLEAN_TYPE
  | TRUE
  | FALSE
  | NULL_TYPE
  | NUMBER_TYPE
  | float
  | OBJECT_TYPE
  | STRING_TYPE
  | string
  | UNDEFINED_TYPE
  | arrayPattern
  | objectPattern
  | PATTERN IDENTIFIER
  | ENUMERATION IDENTIFIER
  | IDENTIFIER
  ;

arrayPattern
  : [ ]
  | [ patternElements ]
  ;

patternElements
  : patternElements , namedPatternElement
  | namedPatternElement
  ;

namedPatternElement
  : patternElement
  | patternElement AS IDENTIFIER
  ;

patternElement
  : pattern
  | pattern ; range
  | ( patternElements )
  | ( patternElements ) ; range
  ;

range
  : integer .. integer
  | .. integer
  | integer ..
  | integer
  ;

objectPattern
  : { }
  | { patternProperties }
  ;

patternProperties
  : patternProperties , namedPatternProperty
  | namedPatternProperty
  ;

namedPatternProperty
  : namedProperty
  | namedProperty AS IDENTIFIER
  ;

namedProperty
  : IDENTIFIER : pattern
  | IDENTIFIER
  ;

boolean
  : TRUE
  | FALSE
  ;

string
  : STRING
  ;

integer
  : NUMBER
  ;

float
  : NUMBER
  ;

stringOrIdentifier
  : IDENTIFIER
  | STRING
  ;

identifiers
  : identifiers , stringOrIdentifier
  | stringOrIdentifier
  ;

```