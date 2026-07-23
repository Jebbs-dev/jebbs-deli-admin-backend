import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const recordSchema = z.object({ id: z.string() }).passthrough();

export const paginatedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    next: z.boolean(),
    previous: z.boolean(),
  });

export const authLoginResponseSchema = z.object({
  message: z.string(),
  user: recordSchema.nullable().optional(),
});

export class AuthLoginResponseDto extends createZodDto(authLoginResponseSchema) {}

/** @deprecated Tokens are set via httpOnly cookies; kept for transitional references */
export const authTokensResponseSchema = authLoginResponseSchema;
export class AuthTokensResponseDto extends AuthLoginResponseDto {}

export const userWrapperResponseSchema = z.object({
  user: recordSchema,
});

export class UserWrapperResponseDto extends createZodDto(userWrapperResponseSchema) {}

export const messageResponseSchema = z.object({
  message: z.string(),
});

export class MessageResponseDto extends createZodDto(messageResponseSchema) {}

export const customerCountResponseSchema = z.object({
  totalCustomers: z.number(),
});

export class CustomerCountResponseDto extends createZodDto(customerCountResponseSchema) {}

export const storeCountResponseSchema = z.object({
  totalStores: z.number(),
});

export class StoreCountResponseDto extends createZodDto(storeCountResponseSchema) {}

export const productCountResponseSchema = z.object({
  totalProducts: z.number(),
});

export class ProductCountResponseDto extends createZodDto(productCountResponseSchema) {}

export const ordersCountResponseSchema = z.object({
  orders: z.array(recordSchema),
  totalOrders: z.number(),
});

export class OrdersCountResponseDto extends createZodDto(ordersCountResponseSchema) {}

export const paymentInitResponseSchema = z.object({
  payment: recordSchema,
  authorization_url: z.string(),
  access_code: z.string(),
});

export class PaymentInitResponseDto extends createZodDto(paymentInitResponseSchema) {}

export const paginatedUsersResponseSchema = paginatedResultSchema(recordSchema);
export class PaginatedUsersResponseDto extends createZodDto(paginatedUsersResponseSchema) {}

export const paginatedStoresResponseSchema = paginatedResultSchema(recordSchema);
export class PaginatedStoresResponseDto extends createZodDto(paginatedStoresResponseSchema) {}

export const paginatedProductsResponseSchema = paginatedResultSchema(recordSchema);
export class PaginatedProductsResponseDto extends createZodDto(paginatedProductsResponseSchema) {}

export const paginatedOrdersResponseSchema = paginatedResultSchema(recordSchema);
export class PaginatedOrdersResponseDto extends createZodDto(paginatedOrdersResponseSchema) {}

export const paginatedPaymentsResponseSchema = paginatedResultSchema(recordSchema);
export class PaginatedPaymentsResponseDto extends createZodDto(paginatedPaymentsResponseSchema) {}

export class RecordResponseDto extends createZodDto(recordSchema) {}

export const recordArrayResponseSchema = z.array(recordSchema);
export class RecordArrayResponseDto extends createZodDto(recordArrayResponseSchema) {}

export const unknownRecordResponseSchema = z.record(z.string(), z.unknown());
export class UnknownRecordResponseDto extends createZodDto(unknownRecordResponseSchema) {}
