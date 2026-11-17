# 0017. Logic subset: Python syntax, JS semantics, Python truthiness

- Status: accepted
- Date: 2026-11-17
- Question: Q16

## Decision
- **Truthiness follows Python**: `if`, `while`, `and`, `or`, `not` and
  conditional expressions use a runtime `truthy()` helper (empty list, dict,
  string, `0`, `None`, `False` are false). `and`/`or` still return an operand.
- **Dicts**: `{name: 1}` bare keys are string keys (differs from Python);
  `{"name": 1}` also allowed. `d.name` and `d["name"]` both work.
- **Exceptions**: `try/except/finally`; `except T as e:` is an `instanceof`
  check, `Exception` matches anything, bare `except:` allowed.
- **Assignment scope**: names declared at component/page level (state,
  props, plain variables) refer to the component when assigned inside
  `def`, `on` or `watch` bodies; other assigned names are block-local. No
  `nonlocal`.
- **Included**: `def`, `async def`/`await`, `return`, `if/elif/else`, `for`,
  `while`, `break/continue`, `try`, expression-only `lambda`, list
  comprehensions, `and/or/not/in/not in/is`, `==` compiles to `===`, `//`,
  `**`, conditional expressions, slicing.
- **Excluded in v1**: classes, generators, dict/set comprehensions,
  decorators, `with`, `global`, keyword-only parameters, `*args`/`**kwargs`.
- Everything else is JS behaviour (e.g. no negative indexing, `==` on lists
  compares identity, integer overflow to float); each difference is listed in
  the spec.

## Alternatives
- Pure JS truthiness; Python-strict dicts; requiring `nonlocal`.

## Reason
Python truthiness removes the most likely bug for a Python-minded author;
the other choices favour ergonomics in markup.

## Consequences / known limitations
A helper call per condition. `in` on a list compiles to `includes`, on a
dict to key lookup, on a string to substring — a small runtime helper.
