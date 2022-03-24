import { Option, Result } from "@swan-io/boxed"

type RequiredKeys<T> = {
    [P in keyof T]: T[P] extends Exclude<T[P], undefined> ? P : never
}[keyof T]

type SchemaFrom<TypeDescription> = {
    [key in keyof TypeDescription]: TypeDescription[key] extends (...args: any[]) => boolean ? TypeDescription[key] : never
}

type ExtractRuntimeType<DescribedType> = {
    [key in keyof DescribedType]: DescribedType[key] extends (args: infer ValueIn) => boolean ? ValueIn : never
}

type IntermediateRuntimeType<RuntimeType> = Partial<ExtractRuntimeType<RuntimeType>> & Pick<ExtractRuntimeType<RuntimeType>, RequiredKeys<ExtractRuntimeType<RuntimeType>>>

type NormaliseOptionals<T> = {
    [key in keyof T]: T[key]
}

type UserType<RuntimeType> = NormaliseOptionals<IntermediateRuntimeType<RuntimeType>>

type ValidationErrors<TypeDescription> = {
    [key in keyof TypeDescription]: string
}


type Creator<TypeDescription> = (type: UserType<TypeDescription>) => Result<UserType<TypeDescription>, ValidationErrors<TypeDescription>>

type Validator<TypeDescription> = (type: UserType<TypeDescription>) => Result<true, ValidationErrors<TypeDescription>>

type Parser<TypeDescription> = (str: string) => Result<UserType<TypeDescription>, ValidationErrors<TypeDescription>>

export const typist = <TypeDescription>(describeType: SchemaFrom<TypeDescription>): {
    create: Creator<TypeDescription>,
    validate: Validator<TypeDescription>,
    parse: Parser<TypeDescription>
} => {

    const create: Creator<TypeDescription> = (type: UserType<TypeDescription>) => {
        return validate(type).match({
            Ok: () => Result.Ok(type),
            Error: errors => Result.Error(errors)
        })
    }

    const validate: Validator<TypeDescription> = (type: UserType<TypeDescription>) => {
        const invalid = Object.entries(describeType).map(([prop, validator]) => {
            return { prop, valid: (validator as (value: any) => boolean)((type as any)[prop]) }
        }).filter(({ valid }) => !valid)
            .reduce((all, { prop }) => ({ ...all, [prop]: "invalid" }), {} as ValidationErrors<TypeDescription>)
        if (Object.entries(invalid).length) {
            return Result.Error(invalid)
        }
        return Result.Ok(true)
    }

    const parse: Parser<TypeDescription> = (str: string) => {
        const attempt = JSON.parse(str) as UserType<TypeDescription>;
        return create(attempt);
    }

    return {
        create,
        validate,
        parse
    }
}

export const types = {
    $optional: <V>(test: (value: V) => boolean) => (value?: V) => typeof value === "undefined" ? true : test(value),
    $string: (value: string) => typeof value === "string",
    $number: (n: number) => typeof n === "number",
    $int: (n: number) => Number.isInteger(n)
}

if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest

    const { $optional, $string, $number, $int } = types;

    const $country = (value: string) => {
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

    const fruitsOfTheIslands = {
        name: $string,
        colour: $string,
        countryOfOrigin: $country,
        tree: $optional($string),
    }

    const { create, validate } = typist(fruitsOfTheIslands)

    test("a bad apple", () => {
        const badApple = create({
            name: "apple",
            colour: "green",
            countryOfOrigin: "spain"
        })
        expect(badApple).toBe(Result.Error({ countryOfOrigin: "invalid" }))
    })

    test("blackberries!", () => {
        const blackberries = create({
            name: "blackberry",
            colour: "purple",
            countryOfOrigin: "england"
        })
        expect(blackberries).toBe(Result.Ok({ colour: "purple", countryOfOrigin: "england", name: "blackberry" }))
    })

}