type RequiredKeys<T> = {
    [P in keyof T]: T[P] extends Exclude<T[P], undefined> ? P : never;
}[keyof T];

type SchemaFrom<TypeDescription> = {
    [key in keyof TypeDescription]: TypeDescription[key] extends (
        ...args: any[]
    ) => any
    ? TypeDescription[key]
    : never;
};

type ExtractRuntimeType<DescribedType> = {
    [key in keyof DescribedType]: DescribedType[key] extends (
        args: infer ValueIn
    ) => boolean
    ? ValueIn
    : never;
};

type IntermediateRuntimeType<RuntimeType> = Partial<
    ExtractRuntimeType<RuntimeType>
> &
    Pick<
        ExtractRuntimeType<RuntimeType>,
        RequiredKeys<ExtractRuntimeType<RuntimeType>>
    >;

type NormaliseOptionals<T> = {
    [key in keyof T]: T[key];
};

type UserType<RuntimeType> = NormaliseOptionals<
    IntermediateRuntimeType<RuntimeType>
>;

type Creator<TypeDescription> = (
    type: UserType<TypeDescription>
) => UserType<TypeDescription>;

type Validator<TypeDescription> = (type: UserType<TypeDescription>) => void;

export const typist = <TypeDescription>(
    describeType: SchemaFrom<TypeDescription>
): [
        creator: Creator<TypeDescription>,
        validator: Validator<TypeDescription>
    ] => {
    const newInstance = (
        type: UserType<TypeDescription>
    ): UserType<TypeDescription> => {
        validateInstance(type);
        return type;
    };

    const validateInstance = (type: UserType<TypeDescription>): void => { };

    return [newInstance, validateInstance];
};

if (import.meta.vitest) {
    const { it, expect } = import.meta.vitest;

    const _optional = <V>(f: (value: V) => boolean) => (value?: V) => {
        if (typeof value === "undefined") {
            return true;
        }
        return f(value);
    }

    const _string = (value: string): boolean => {
        if (typeof value === "string") {
            return true;
        }
        return false;
    };

    const _number = (n: number): boolean => {
        if (typeof n === "number") {
            return true;
        }
        return false;
    };

    const _int = (n: number): boolean => {
        if (_number(n)) {
            if (parseInt(n.toString()).toString() === n.toString()) {
                return true;
            }
        }
        return false;
    }

    const fruitTypeDescription = {
        colour: _optional(_string),
        size: _number,
        segments: _optional(_int)
    };

    const [newFruit, validateFruit] = typist(fruitTypeDescription);

    type fruitType = ReturnType<typeof newFruit>;

    const f: fruitType = {
        size: 1,
    };

    type expectedFruitType = { colour?: string, size: number, segments?: number }
    
    expect<expectedFruitType>(f);

}
