export const TOKENS = {
  StorageService: Symbol.for("StorageService"),
  AuthClient: Symbol.for("AuthClient"),
  AuthRepository: Symbol.for("AuthRepository"),
  AuthStore: Symbol.for("AuthStore"),
  AuthService: Symbol.for("AuthService"),
  UserRepository: Symbol.for("UserRepository"),
  UsersService: Symbol.for("UsersService"),
} as const;
