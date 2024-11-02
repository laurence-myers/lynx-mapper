/**
 * "Exhaustive" object mapper.
 *
 * @example ```ts
 * import { ObjectMapper, OmitProperty } from "./";
 *
 * // Set up the types and object mapper.
 *
 * interface UserEntity {
 *   email: string;
 *   firstName: string;
 *   lastName: string;
 *   permissions: Array<'create' | 'delete' | 'read' | 'update'>;
 *   username: string;
 * }
 *
 * interface UserDto {
 *   fullName: string;
 *   permissions?: UserEntity['permissions'];
 * }
 *
 * interface UserMappingContext {
 *   requesterAccess: 'admin' | 'user';
 * }
 *
 * // We create an instance of `ObjectMapper`.
 * const objectMapper = new ObjectMapper<UserEntity, UserDtoContext, UserMappingContext>({
 *   fullName: (input) => `${input.firstName} ${input.lastName}`,
 *   permissions: (input, context) => context.requesterAccess === 'admin' ? input.permissions : OmitProperty,
 * });
 *
 * // Then, when it's time to map something, in say an API endpoint...
 *
 * // We'll create an input object here, but this would normally come from
 * //  somewhere else, like an HTTP request body, or a database repository.
 * const userEntity: UserEntity = {
 *   email: 'bobt@pinafore.cruise',
 *   firstName: 'Bob',
 *   lastname: 'Terwilliger',
 *   permissions: ['delete'],
 *   username: 'bterwilliger',
 * };
 *
 * // This mapper uses a context.
 * const context = {
 *   requesterAccess: 'admin'
 * };
 *
 * // Invoke the mapper.
 * const outputDto = objectMapper.map(userEntity, context);
 * ```
 *
 * @module
 */

export * from "./src/map-from.ts";
export * from "./src/object-mapper.ts";
export * from "./src/omit-property.ts";
