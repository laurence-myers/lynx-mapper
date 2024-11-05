/**
 * "Exhaustive" object mapper.
 *
 * @example ```ts
 * import { mapFrom } from "./src/map-from.ts";
 * import { ObjectMapper } from "./src/object-mapper.ts";
 * import { OmitProperty } from "./src/omit-property.ts";
 *
 * // Set up the types and object mapper.
 *
 * // This will be our input type. It could represent some database row.
 * interface UserEntity {
 *   email: string;
 *   firstName: string;
 *   lastName: string;
 *   permissions: Array<'create' | 'delete' | 'read' | 'update'>;
 *   username: string;
 * }
 *
 * // This will be our output type. It is some Data Transfer Object (DTO).
 * //  Perhaps we send this data structure in a JSON API response body.
 * interface UserDto {
 *   fullName: string;
 *   permissions?: UserEntity['permissions'];
 *   username: string;
 * }
 *
 * interface UserMappingContext {
 *   requesterAccess: 'admin' | 'user';
 * }
 *
 * // We create an instance of `ObjectMapper` by calling `ObjectMapper.create()({ ... })`.
 * //  Yes, that's a double-function-call. `ObjectMapper.create()` returns a function, which
 * //  accepts a schema, and returns an `ObjectMapper`. This is to make use of a neat type-safety trick.
 * //  You should only create one global instance, you don't need to create one each time you
 * //  want to map an object.
 * const objectMapper = ObjectMapper.create<UserEntity, UserDto, UserMappingContext>()({
 *   // A mapper function with some logic
 *   fullName: (input) => `${input.firstName} ${input.lastName}`,
 *   // A mapper function that uses context
 *   permissions: (input, context) => context.requesterAccess === 'admin' ? input.permissions : OmitProperty,
 *   // A quick mapping shortcut, using the name of a property on the input object
 *   username: "username",
 * });
 *
 * // Then, when it's time to map something, in say an API endpoint...
 *
 * // We'll create an input object here, but this would normally come from
 * //  somewhere else, like an HTTP request body, or a database repository.
 * const userEntity: UserEntity = {
 *   email: "bobt@pinafore.cruise",
 *   firstName: "Bob",
 *   lastName: "Terwilliger",
 *   permissions: ["delete"],
 *   username: "bterwilliger",
 * };
 *
 * // This mapper uses a context.
 * const context: UserMappingContext = {
 *   requesterAccess: 'admin'
 * };
 *
 * // Invoke the mapper.
 * const outputDto = objectMapper.map(userEntity, context);
 * console.log(outputDto);
 * // --> { fullName: "Bob Terwilliger", permissions: ["delete"], username: "bterwilliger" }
 *
 * // Prefer functions?
 * const mapUserDto = objectMapper.toFunction();
 *
 * const outputDto2 = mapUserDto(userEntity, { requesterAccess: "user" });
 * console.log(outputDto2);
 * // --> { fullName: "Bob Terwilliger", username: "bterwilliger" }
 *
 * // Mapper functions can be reused from an existing mapper's schema.
 * // Also, context is optional.
 * const objectMapperNoContext = ObjectMapper.create<UserEntity, UserDto>()({
 *   fullName: objectMapper.schema.fullName,
 *   permissions: mapFrom.omit,
 *   username: objectMapper.schema.username,
 * });
 *
 * const outputDto3 = objectMapperNoContext.map(userEntity);
 * console.log(outputDto3);
 * // --> { fullName: "Bob Terwilliger", username: "bterwilliger" }
 * ```
 *
 * ---
 *
 * ## Why?
 *
 * You might be wondering, why add this complexity when a simple function or class
 *  does the same job?
 *
 * ### vs. Function
 *
 * You could just write a function:
 *
 * ```ts
 * function mapUserDto(input: UserEntity): UserDto {
 *   return {
 *     fullName: `${input.firstName} ${input.lastName}`,
 *     username: input.username,
 *   };
 * }
 * ```
 *
 * There's some disadvantages:
 *
 * - We have forgotten to map `permissions`. TypeScript doesn't complain, because the
 *   property is optional.
 * - It's tricky to compose mapping functions.
 *
 * Let's say we have two versions of `UserDto`; in v2, we return the first and last name
 *   separately, and omit permissions entirely.
 *
 * ```ts
 * type UserDtoV1 = UserDto;
 *
 * interface UserDtoV2 {
 *   firstName: string;
 *   lastName: string;
 *   username: string;
 * }
 *
 * function mapUserDtoV1(input: UserEntity, context: UserMappingContext): UserDtoV1 {
 *   return {
 *     fullName: `${input.firstName} ${input.lastName}`,
 *     permissions: context.requesterAccess === "admin" ? input.permissions : undefined,
 *     username: input.username,
 *   };
 * }
 *
 * function mapUserDtoV2Bad(input: UserEntity, context: UserMappingContext): UserDtoV2 {
 *   return {
 *     ...mapUserDtoV1(
 *       input,
 *       context // We don't actually _need_ the context for a V2 mapper, but must provide it for the V1 mapper
 *     ),
 *     firstName: input.firstName,
 *     lastName: input.lastName,
 *   };
 * }
 *
 * console.log(mapUserDtoV2Bad(userEntity, { requesterAccess: "admin" }));
 * // {
 * //   fullName: "Bob Terwilliger", // should not be here
 * //   permissions: ["delete"], // should not be here
 * //   username: "bterwilliger",
 * //   firstName: "Bob",
 * //   lastName: "Terwilliger"
 * // }
 *
 * function mapUserDtoV2Better(input: UserEntity, context: UserMappingContext): UserDtoV2 {
 *   return {
 *     // Assuming we have some `omit()` function...
 *     ...omit(mapUserDtoV1(
 *       input,
 *       context
 *     ), ['fullName', 'permissions']),
 *     firstName: input.firstName,
 *     lastName: input.lastName,
 *   };
 * }
 *
 * console.log(mapUserDtoV2Better(userEntity, { requesterAccess: "admin" }));
 * // {
 * //   username: "bterwilliger",
 * //   firstName: "Bob",
 * //   lastName: "Terwilliger"
 * // }
 * ```
 *
 * Even this "better" function is not ideal. We create an intermediate object for the UserDtoV1,
 *  and another from the call to `omit()`. If `UserDtoV1` gets new properties, we might need to
 *  add them to the `omit()` keys array - the compiler won't warn us about this.
 *  If `UserDtoV2` adds an optional property, the compiler won't warn us that we've forgotten
 *  to map it.
 *
 * Finally, a function can do anything. It could perform side effects, such as fetching data from
 *  a database. Ideally, a mapping function _only_ performs mapping.
 *
 * ### vs. Class
 *
 * You could construct the output type by instantiating a class. Each property value can be passed
 * as an argument to the constructor.
 *
 * ```ts
 * class UserDtoImpl implements UserDto {
 *   public fullName: string
 *   public permissions?: UserDto['permissions']
 *   public username: string
 *
 *   constructor(
 *     input: UserEntity,
 *     context: UserMappingContext
 *   ) {
 *     this.fullName = `${input.firstName} ${input.lastName}`;
 *     this.username = input.username;
 *   }
 * }
 * ```
 *
 * Disadvantages:
 *
 * - We've forgotten to map `permissions`. TypeScript doesn't complain, because the
 *   property is optional.
 * - In this example, we only accept a `UserEntity` as the input. If we wanted to create
 *   a `UserDtoImpl` from some other input, we need to change
 *
 * Let's look at a different approach, where the constructor takes each property as a separate argument.
 *
 * ```ts
 * class UserDtoImplSeparateArgs implements UserDto {
 *   constructor(
 *     public fullName: string,
 *     public permissions: UserDto['permissions'] | undefined,
 *     public username: string,
 *   ) {
 *   }
 * }
 *
 * function mapUserEntityToUserDto(input: UserEntity, context: UserMappingContext): UserDto {
 *   return new UserDtoImplSeparateArgs(
 *     `${input.firstName} ${input.lastName}`,
 *     context.requesterAccess === 'admin' ? input.permissions : undefined,
 *     input.username,
 *   );
 * }
 * ```
 *
 * This has moved the mapping logic out of the constructor, into the code calling the constructor.
 *  To avoid duplication, we add a mapping function. (This could also be a static method on the class.)
 *
 * Disadvantages:
 *
 * - If we add a property to the output type/class, we have to add it to the constructor. It'll probably
 *    be easiest to add it to the end of the existing parameters. This will get tricky to read and write.
 * - Rather than passing individual args, we could pass one arg containing all the values. This seems silly;
 *    why would we create an object to create a different (but similar) object?
 * - You can't easily compose mapping logic. Inheritance is an option, but could become unwieldy,
 *   particularly if you want to omit properties.
 *
 * @module
 */

export * from "./src/map-from.ts";
export * from "./src/object-mapper.ts";
export * from "./src/omit-property.ts";
export * as types from "./src/types.ts";
