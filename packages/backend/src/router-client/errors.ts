export class RouterAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouterAuthError';
  }
}

export class RouterUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouterUnreachableError';
  }
}

export class RouterUnsupportedFeatureError extends Error {
  constructor(public readonly oid: string) {
    super(`Router does not expose oid "${oid}" (unsupported on this firmware/model)`);
    this.name = 'RouterUnsupportedFeatureError';
  }
}
