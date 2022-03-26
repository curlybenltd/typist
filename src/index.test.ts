import { Result } from "@swan-io/boxed";
import { test, expect, describe, fn } from "vitest"
import { types, typist, factor, InputOf, ValueType, TypeFrom } from "."
const { $optional, $string } = types;


describe("island fruit", () => {
    const { $country } = factor({
        country: [
            (value: string) => {
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
            }, "$string"]
    })

    const fruitModule = typist({
        name: $string,
        colour: $string,
        countryOfOrigin: $country,
        tree: $optional($string),
    })

    type Fruit = TypeFrom<typeof fruitModule>

    const { create: createFruit, validate: validateFruit } = fruitModule;

    test("a bad apple", () => {
        const badApple = createFruit({
            name: "apple",
            colour: "green",
            countryOfOrigin: "spain"
        } as Fruit)
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

    test("describe", () => {
        const description = fruitModule.toTypeDef();

        expect(description).toStrictEqual({
            properties: {
                name: { type: "string" },
                colour: { type: "string" },
                countryOfOrigin: { type: "string" },
            },
            optionalProperties: {
                tree: { type: "string" }
            }
        })
    })
})

describe("creating custom factors", () => {
    test("create a range factor and verify it works", () => {

        const { $range } = factor({
            range: (min: number, max: number): ValueType<number> => (n: number) => {
                return n >= min && n <= max;
            }
        })

        const { create: createEndpoint } = typist({
            port: $range(2000, 2999)
        })

        createEndpoint({
            port: 1000
        }).match({
            Error: error => expect(error).toStrictEqual({ port: "invalid" }),
            Ok: fn()
        })

        createEndpoint({
            port: 2000
        }).match({
            Error: fn(),
            Ok: value => expect(value).toStrictEqual({ port: 2000 })
        })
    })
})