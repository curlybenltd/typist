# typist

### Pleasant Runtime Types for JavaScript and TypeScript

Runtime types don't exist in JavaScript (or TypeScript) and there are lots of awful solutions that make you write hellish schemas.

typist was written to be a pleasant alternative to duplicating type knowledge across your codebase.

To make things nicer typist uses [@swan-io/boxed](https://swan-io.github.io/boxed/) to make handling the unhappy path as much fun as the happy path. No null checks, no accidental nulls!


## How to Use: A Fruit Type

Let's look at a verbose example of a `Fruit` type.

To create the typist module, import the `typist` function and pass it a type description:

```TypeScript
import { typist, types } from "@curlyben/typist"

const fruitModule = typist({
    name: types.$string,
    colour: types.$string,
    countryOfOrigin: types.$string,
    tree: types.$optional(types.$string),
})
```

The first thing you'll notice is that there isn't an exportable fruit type. We don't always need a type, but if we did, we could capture one with the `InputOf<T>` like so:

```TypeScript
import { InputOf } from "@curlyben/typist"

export type Fruit = InputOf<typeof fruitModule.create>
```


```
// 2: create things
const apple = createFruit({
    name: "apple",
    colour: "green",
    countryOfOrigin: "spain"
})
// ...and use them safely
apple.match({
    Ok: apple => eat(apple),
    Error: error => yell(error),
})

// 2.5: create things
export type Fruit = InputOf<typeof createFruit>
const orange = {
    name: "orange",
    colour: "orange",
    countryOfOrigin: "spain"
}
// ...and use them safely
validateFruit(orange).match({
    Ok: orange => makeJuice(orange),
    Error: error => yell(error),
})

// 2.75: create things
const banana = {
    name: "banana",
    colour: "yellow",
    countryOfOrigin: ["indonesia", "philippines"]
}
// ...and use them safely
validateFruit(banana).match({
    Ok: banana => peel(banana),
    Error: error => yell(error),
})
```