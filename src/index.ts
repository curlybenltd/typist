import { Result } from "@swan-io/boxed"

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

type Stringifier<TypeDescription> = (value: UserType<TypeDescription>) => Result<string, ValidationErrors<TypeDescription>>

type TypeModule<TypeDescription> = {
    create: Creator<TypeDescription>,
    validate: Validator<TypeDescription>,
    parse: Parser<TypeDescription>,
    stringify: Stringifier<TypeDescription>,
}

export const typist = <TypeDescription>(describeType: SchemaFrom<TypeDescription>): TypeModule<TypeDescription> => {

    const create: Creator<TypeDescription> = (type) => {
        return validate(type).match({
            Ok: () => Result.Ok(type),
            Error: errors => Result.Error(errors)
        })
    }

    const validate: Validator<TypeDescription> = (type) => {
        const invalid = Object.entries(describeType).map(([prop, validator]) => {
            return { prop, valid: (validator as (value: any) => boolean)((type as any)[prop]) }
        }).filter(({ valid }) => !valid)
            .reduce((all, { prop }) => ({ ...all, [prop]: "invalid" }), {} as ValidationErrors<TypeDescription>)
        if (Object.entries(invalid).length) {
            return Result.Error(invalid)
        }
        return Result.Ok(true)
    }

    const parse: Parser<TypeDescription> = (str) => {
        const attempt = JSON.parse(str) as UserType<TypeDescription>;
        return create(attempt);
    }

    const stringify: Stringifier<TypeDescription> = (value) => {
        return validate(value).match({
            Ok: () => Result.Ok(JSON.stringify(value)),
            Error: (error) => Result.Error(error)
        })
    }

    return {
        create,
        validate,
        parse,
        stringify,
    }
}

export type ValueType<Type> = (value: Type) => boolean;

export const types = {
    $optional: <V>(test: (value: V) => boolean) => ((value?: V) => typeof value === "undefined" ? true : test(value)) as ValueType<V | undefined>,
    $string: ((value: string) => typeof value === "string") as ValueType<string>,
    $number: ((n: number) => typeof n === "number") as ValueType<number>,
    $int: ((n: number) => Number.isInteger(n)) as ValueType<number>,
}

export type InputOf<C extends Creator<any>> = Parameters<C>[0]

export type TypeFrom<C extends TypeModule<any>> = InputOf<C["create"]>