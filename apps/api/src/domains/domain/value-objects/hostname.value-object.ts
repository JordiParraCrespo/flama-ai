import { ArgumentInvalidException, type DomainPrimitive, ValueObject } from '@flama/backend-ddd';

/**
 * A bare hostname (`example.com`, `blog.example.com`) — no scheme, no port, no
 * path. Subdomains are tracked as separate domains, so the value is stored
 * exactly as given apart from case and a trailing dot, which carry no meaning.
 */
export class Hostname extends ValueObject<string> {
  private static readonly HOSTNAME_REGEX =
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

  /** Normalize before constructing: hostnames are case-insensitive. */
  static of(value: string): Hostname {
    return new Hostname({
      value: value.trim().toLowerCase().replace(/\.$/, ''),
    });
  }

  get value(): string {
    return this.props.value;
  }

  protected validate({ value }: DomainPrimitive<string>): void {
    if (value.length > 253) {
      throw new ArgumentInvalidException(`Hostname is longer than 253 characters: ${value}`);
    }
    if (!Hostname.HOSTNAME_REGEX.test(value)) {
      throw new ArgumentInvalidException(
        `Invalid hostname: ${value}. Expected a bare domain name such as example.com`,
      );
    }
  }
}
