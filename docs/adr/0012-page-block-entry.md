# 0012. Entry point is a page block

- Status: accepted
- Date: 2026-11-17
- Question: Q10

## Decision
A file is an entry when it contains a top-level `page "Title":` block; at
most one per file. Attributes are allowed (`page "Shop" lang="en":`) and
go on `<html>`. The page body has the same rules as a component body.
Files without a page are libraries.

## Alternatives
- Mount a component named `App`, with a `title` statement.
- Top-level markup is the page.

## Reason
Explicit and easy to find; keeps library files and pages distinct.

## Consequences / known limitations
A page cannot take props. Building a library file on its own is an error.
