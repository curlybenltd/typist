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
    toTypeDef: () => {}
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

    const toTypeDef = () => {
        return Object.entries(describeType).reduce((schema, [name, prop]) => {
            if (getFlag(prop, "optional")) {
                return ({
                    ...schema,
                    optionalProperties: {
                        ...schema.optionalProperties,
                        [name]: {
                            type: (prop as any).__jtdType?.substring(1)
                        }
                    },
                })
            }
            return ({
                ...schema,
                properties: {
                    ...schema.properties,
                    [name]: {
                        type: (prop as any).__jtdType?.substring(1)
                    }
                },
            })
        }, {} as TypeDef)
    }

    return {
        create,
        validate,
        parse,
        stringify,
        toTypeDef,
    }
}

export type TypeDef = {
    properties: any,
    optionalProperties: any
}

export type ValueType<Type> = (value: Type) => boolean;

export type InputOf<C extends Creator<any>> = Parameters<C>[0]

export type TypeFrom<C extends TypeModule<any>> = InputOf<C["create"]>

type Factors<T> = {
    [key in keyof T as `$${string & key}`]: T[key] extends [infer F, JtdType] ? (
        F extends ((...args: infer OF) => ValueType<infer TF>)
        ? F
        : F extends ValueType<infer A>
        ? ValueType<A>
        : never
    ) :
    T[key] extends ((...args: infer OF) => ValueType<infer TF>)
    ? T[key]
    : T[key] extends ValueType<infer A>
    ? ValueType<A>
    : never
}

export const factor = <T extends { [key: string]: (F | [F, JtdType]) }, F = (ValueType<any> | ((...args: any[]) => ValueType<any>))>(factors: T): Factors<T> => {
    return Object.entries(factors).reduce((exports, [name, valueType]) => {
        if (Array.isArray(valueType)) {
            let [tupledValue, jtdType] = valueType
            return ({ ...exports, [`$${name}`]: setJtdType(tupledValue, (tupledValue as any).__jtdType ? `$${(tupledValue as any).__jtdType}(${jtdType})` : `${jtdType}`) })
        }
        return ({ ...exports, [`$${name}`]: setJtdType(valueType, (valueType as any).__jtdType ? `$${(valueType as any).__jtdType}(${name})` : `$${name}`) })
    }, {} as Factors<T>)
}

export type JtdType = "$boolean" | "$string" | "$timestamp" | "$float32" | "$float64" | "$int8" | "$uint8" | "$int16" | "$uint16" | "$int32" | "$uint32";

const setJtdType = <X>(x: X, __jtdType: JtdType | string): X => {
    Object.assign(x, { __jtdType })
    return x
}

const setFlag = <X>(x: X, flag: string, value: any): X => {
    Object.assign(x, { [`__${flag}`]: value })
    return x
}

const getFlag = (x: any, flag: string) => {
    return x[`__${flag}`]
}

export const types = factor({
    optional: <V>(test: (value: V) => boolean) => setFlag(setJtdType((value?: V) => typeof value === "undefined" ? true : test(value), `${(test as any).__jtdType}`), "optional", true) as ValueType<V | undefined>,
    string: ((value: string) => typeof value === "string") as ValueType<string>,
    number: ((n: number) => typeof n === "number") as ValueType<number>,
    int: ((n: number) => Number.isInteger(n)) as ValueType<number>,
})