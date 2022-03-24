import { Result } from "@swan-io/boxed";
import { test, expect } from "vitest"
import { types, typist, InputOf, ValueType } from "."
const { $optional, $string } = types;

const $country: ValueType<string> = (value: string) => {
    if ($string(value)) {
        return [
            "UK",
            "GB",
            "ENGLAND",
            "WALES",
            "SCOTLAND",
            "NI",
            "NORTHERN IRELAND",
            "IE",
            "EIRE",
            "IRELAND"
        ].includes(value.toLocaleUpperCase())
    }
    return false;
}

const { create: createFruit, validate: validateFruit } = typist({
    name: $string,
    colour: $string,
    countryOfOrigin: $country,
    tree: $optional($string),
})

test("a bad apple", () => {
    const badApple = createFruit({
        name: "apple",
        colour: "green",
        countryOfOrigin: "spain"
    })
    expect(badApple).toStrictEqual(Result.Error({ countryOfOrigin: "invalid" }))
})

test("blackberries!", () => {
    const blackberries = createFruit({
        name: "blackberry",
        colour: "purple",
        countryOfOrigin: "england"
    })
    expect(blackberries).toStrictEqual(Result.Ok({ colour: "purple", countryOfOrigin: "england", name: "blackberry" }))
})

test("validation", () => {
    type IslandFruit = InputOf<typeof createFruit>;
    const banana = {
        name: "banana",
        colour: "yellow",
        countryOfOrigin: ["indonesia", "philippines"],
        tree: "banana"
    }
    expect(validateFruit(banana as any as IslandFruit)).toEqual(Result.Error({ countryOfOrigin: "invalid" }))
})