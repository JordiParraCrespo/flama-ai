import { ValueObject } from './value-object.base';

/**
 * Recursively converts entity/value-object props to a plain object, unpacking
 * any nested value objects. Used by `Entity.toObject()` and
 * `ValueObject.unpack()`.
 */
export function convertPropsToObject(props: unknown): unknown {
  const propsCopy = structuredClone(props) as Record<string, unknown>;

  for (const prop in propsCopy) {
    if (Array.isArray(propsCopy[prop])) {
      propsCopy[prop] = (propsCopy[prop] as Array<unknown>).map((item) =>
        convertToPlainObject(item),
      );
    }
    propsCopy[prop] = convertToPlainObject(propsCopy[prop]);
  }

  return propsCopy;
}

function convertToPlainObject(item: unknown): unknown {
  if (ValueObject.isValueObject(item)) {
    return item.unpack();
  }
  return item;
}
