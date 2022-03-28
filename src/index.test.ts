import { Result } from "@swan-io/boxed";
import { test, expect, describe, fn } from "vitest"
import { types, type, factor, InputOf, ValueType, TypeFrom, Invalid } from "."
const { optional, string } = types;


describe("island fruit", () => {
    const { country } = factor({
        country: [
            ((value: string) => {
                if (typeof value === "string") {
                    const ok = [
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
                    ].includes(value.toLocaleUpperCase());
                    if (ok) {
                        return Result.Ok(value);
                    }
                }
                return Invalid;
            }) as ValueType<string>, "string"]
    })

    const fruitModule = type({
        name: string,
        colour: string,
        countryOfOrigin: country,
        tree: optional(string),
    })

    type Fruit = TypeFrom<typeof fruitModule>

    const { create: fruit, validate: validateFruit } = fruitModule;

    test("a bad apple", () => {
        const badApple = fruit({
            name: "apple",
            colour: "green",
            countryOfOrigin: "spain"
        } as Fruit)
        expect(badApple).toStrictEqual(Result.Error({ countryOfOrigin: "invalid" }))
    })

    test("blackberries!", () => {
        const blackberries = fruit({
            name: "blackberry",
            colour: "purple",
            countryOfOrigin: "england"
        })
        expect(blackberries).toStrictEqual(Result.Ok({ colour: "purple", countryOfOrigin: "england", name: "blackberry" }))
    })

    test.only("validation", () => {
        type IslandFruit = InputOf<typeof fruit>;
        const banana = {
            name: "banana",
            colour: "yellow",
            countryOfOrigin: ["indonesia", "philippines"],
            tree: "banana"
        }
        expect(validateFruit(banana as any as IslandFruit)).toEqual(Result.Error({ countryOfOrigin: new Error("invalid") }))
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

        const { range } = factor({
            range: (min: number, max: number): ValueType<number> => (n: number) => {
                return n >= min && n <= max;
            }
        })

        const { create: endpoint } = type({
            port: range(2000, 2999)
        })

        endpoint({
            port: 1000
        }).match({
            Error: error => expect(error).toStrictEqual({ port: "invalid" }),
            Ok: fn()
        })

        endpoint({
            port: 2000
        }).match({
            Error: fn(),
            Ok: value => expect(value).toStrictEqual({ port: 2000 })
        })
    })
})