# API Documentation

This document provides a detailed overview of the API endpoints available for client frontends.

## Authentication

All API endpoints are protected and require a valid JSON Web Token (JWT) to be sent in the `Authorization` header.

```
Authorization: Bearer <your_jwt_token>
```

## Error Responses

In case of an error (status codes `4xx` or `5xx`), the API returns a standardized JSON object with the following structure.

**Example Error Body (`404 Not Found`)**

```json
{
  "class": "App\\Shared\\Domain\\Exception\\ResourceNotFoundException",
  "code": 404,
  "message": "The requested resource was not found."
}
```

**Fields:**

-   `class` (string): The fully qualified class name of the exception that was thrown.
-   `code` (integer): The HTTP status code.
-   `message` (string): A human-readable message describing the error.


## Bounded Contexts

The API is organized into the following Bounded Contexts, each representing a specific area of the application's functionality:

- [Account](#account)
- [Expense](#expense)
- [Income](#income)
- [ResidentUnit](#resident-unit)
- [Slip](#slip)
- [User](#user)

---

## Account

The Account context manages all financial accounts.

### `GET /api/v1/accounts/health-check`

Performs a health check of the Account context. This endpoint does not require authentication.

**Responses:**

-   `200 OK`: The service is healthy.

**Example Response:**

```json
{
  "status": 200
}
```

### `PUT /api/v1/accounts/create`

Creates a new account.

**Request Body:**

```json
{
  "id": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "code": "1.01.01",
  "name": "Cash"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the account (UUID format).
-   `code` (string, required): The account code.
-   `name` (string, required): The name of the account.

**Responses:**

-   `201 Created`: The account was created successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `GET /api/v1/accounts`

Retrieves a list of all accounts.

**Responses:**

-   `200 OK`: The request was successful.

**Example Success Response:**

```json
[
  {
    "id": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
    "code": "1.01.01",
    "name": "Cash",
    "balance": 150075,
    "isActive": true,
    "createdAt": "2023-10-27T10:00:00+00:00",
    "updatedAt": "2023-10-27T10:00:00+00:00"
  },
  {
    "id": "c3e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3c",
    "code": "1.01.02",
    "name": "Savings",
    "balance": 500000,
    "isActive": true,
    "createdAt": "2023-10-27T10:00:00+00:00",
    "updatedAt": "2023-10-27T10:00:00+00:00"
  }
]
```

### `GET /api/v1/accounts/{id}`

Retrieves a single account by its ID.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the account (UUID format).

**Responses:**

-   `200 OK`: The request was successful.
-   `404 Not Found`: The specified account does not exist.

**Example Success Response:**

```json
{
  "id": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "code": "1.01.01",
  "name": "Cash",
  "balance": 150075,
  "isActive": true,
  "createdAt": "2023-10-27T10:00:00+00:00",
  "updatedAt": "2023-10-27T10:00:00+00:00"
}
```

### `PATCH /api/v1/accounts/{id}`

Updates an existing account's details.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the account to update (UUID format).

**Request Body:**

```json
{
  "code": "1.01.01.A",
  "name": "Main Cash Account"
}
```

**Body Parameters:**

-   `code` (string, optional): The new account code.
-   `name` (string, optional): The new name for the account.

**Responses:**

-   `204 No Content`: The account was updated successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `404 Not Found`: The specified account does not exist.

### `PATCH /api/v1/accounts/enable/{id}`

Enables an account, setting its `isActive` status to `true`.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the account to enable (UUID format).

**Responses:**

-   `204 No Content`: The account was enabled successfully.
-   `404 Not Found`: The specified account does not exist.

### `PATCH /api/v1/accounts/disable/{id}`

Disables an account, setting its `isActive` status to `false`.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the account to disable (UUID format).

**Responses:**

-   `204 No Content`: The account was disabled successfully.
-   `404 Not Found`: The specified account does not exist.

### `GET /api/v1/accounts/{id}/balance`

Retrieves the current balance for a specific account.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the account (UUID format).

**Responses:**

-   `200 OK`: The request was successful.
-   `404 Not Found`: The specified account does not exist.

**Example Success Response:**

```json
{
  "balance": 150075
}
```

### `PUT /api/v1/accounts/{id}/initial-balance`

Sets the initial balance for an account. This should typically be used only once during setup.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the account (UUID format).

**Request Body:**

```json
{
  "balance": 500000
}
```

**Body Parameters:**

-   `balance` (integer, required): The initial balance for the account, specified in cents.

**Responses:**

-   `204 No Content`: The initial balance was set successfully.
-   `400 Bad Request`: The request was malformed (e.g., balance is not a number).
-   `404 Not Found`: The specified account does not exist.

---

## Expense

The Expense context manages all expenses.

### `GET /api/v1/expenses/health-check`

Performs a health check of the Expense context. This endpoint does not require authentication.

**Responses:**

-   `200 OK`: The service is healthy.

**Example Response:**

```json
{
  "status": 200
}
```

### `PUT /api/v1/expenses/enter`

Enters a new expense.

**Request Body:**

```json
{
  "id": "d4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3d",
  "amount": 10000,
  "type": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
  "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "dueDate": "2023-11-15",
  "isActive": true,
  "description": "Monthly internet service",
  "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the expense (UUID format).
-   `amount` (integer, required): The expense amount (in cents).
-   `type` (string, required): The unique identifier for the expense type (UUID format).
-   `accountId` (string, required): The ID of the account associated with the expense.
-   `dueDate` (string, required): The due date of the expense (format: `YYYY-MM-DD`).
-   `isActive` (boolean, optional): Whether the expense is active. Defaults to `true`.
-   `description` (string, optional): A description of the expense.
-   `residentUnitId` (string, optional): The ID of the resident unit associated with the expense.

**Responses:**

-   `201 Created`: The expense was created successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `PUT /api/v1/expenses/enter-description`

Enters a new expense with a required description.

**Request Body:**

```json
{
  "id": "d4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3d",
  "amount": 10000,
  "type": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
  "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "dueDate": "2023-11-15",
  "description": "Monthly internet service"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the expense (UUID format).
-   `amount` (integer, required): The expense amount (in cents).
-   `type` (string, required): The unique identifier for the expense type (UUID format).
-   `accountId` (string, required): The ID of the account associated with the expense.
-   `dueDate` (string, required): The due date of the expense (format: `YYYY-MM-DD`).
-   `description` (string, required): A description of the expense.

**Responses:**

-   `201 Created`: The expense was created successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `GET /api/v1/expenses`

Retrieves a list of all expenses.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "0e45a25e-6857-40f5-86ae-b1031bd51c3f",
    "amount": 9000,
    "description": "Robert telf. 555-313131 (October 2025)",
    "dueDate": "2025-10-09 00:00:00",
    "paidAt": null,
    "createdAt": "2025-10-15 22:32:02",
    "residentUnitId": null,
    "type": {
        "id": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
        "code": "MR1GE",
        "name": "MANUTENCAO_GERAL",
        "distributionMethod": "EQUAL",
        "description": "Pequenos reparos (hidráulica, elétrica em áreas comuns, chaveiro, etc.)."
    },
    "account": {
        "id": "6509f512-11f6-4f39-8457-e5e2ad9e221f",
        "code": "TRE23UY",
        "name": "Conta Principal",
        "description": "Esta é a conta principal do condominio, utilizada para gastos correntes.",
        "isActive": true
    },
    "recurringExpense": "c9e67e09-84ca-4c73-8f3d-6377d6d852db"
  }
]
```

### `GET /api/v1/expenses/{id}`

Retrieves a single expense by its ID.

**Parameters:**

-   `id` (string, required): The unique identifier of the expense.

**Responses:**

-   `200 OK`: The request was successful.
-   `404 Not Found`: The specified expense does not exist.

**Example Response:**

```json
{
  "id": "0e45a25e-6857-40f5-86ae-b1031bd51c3f",
  "amount": 9000,
  "description": "Robert telf. 555-313131 (October 2025)",
  "dueDate": "2025-10-09 00:00:00",
  "paidAt": null,
  "createdAt": "2025-10-15 22:32:02",
  "residentUnitId": null,
  "type": {
      "id": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
      "code": "MR1GE",
      "name": "MANUTENCAO_GERAL",
      "distributionMethod": "EQUAL",
      "description": "Pequenos reparos (hidráulica, elétrica em áreas comuns, chaveiro, etc.)."
  },
  "account": {
      "id": "6509f512-11f6-4f39-8457-e5e2ad9e221f",
      "code": "TRE23UY",
      "name": "Conta Principal",
      "description": "Esta é a conta principal do condominio, utilizada para gastos correntes.",
      "isActive": true
  },
  "recurringExpense": "c9e67e09-84ca-4c73-8f3d-6377d6d852db"
}
```

### `PATCH /api/v1/expenses/update/{id}`

Updates an expense.

**Parameters:**

-   `id` (string, required): The unique identifier of the expense to update.

**Request Body:**

```json
{
  "dueDate": "2023-11-20",
  "description": "Updated description"
}
```

**Parameters:**

-   `dueDate` (string, optional): The new due date of the expense (format: `YYYY-MM-DD`).
-   `description` (string, optional): The new description of the expense.

**Responses:**

-   `204 No Content`: The expense was updated successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `404 Not Found`: The specified expense does not exist.

### `PATCH /api/v1/expenses/compensate/{id}`

Compensates an expense.

**Parameters:**

-   `id` (string, required): The unique identifier of the expense to compensate.

**Request Body:**

```json
{
  "amount": 5000
}
```

**Parameters:**

-   `amount` (integer, optional): The amount to compensate. If not provided, the full amount of the expense will be compensated.

**Responses:**

-   `204 No Content`: The expense was compensated successfully.
-   `404 Not Found`: The specified expense does not exist.
-   `409 Conflict`: The expense cannot be compensated in its current state.

### `PATCH /api/v1/expenses/payed/{id}`

Marks an expense as payed.

**Parameters:**

-   `id` (string, required): The unique identifier of the expense to mark as payed.

**Responses:**

-   `204 No Content`: The expense was marked as payed successfully.
-   `404 Not Found`: The specified expense does not exist.

### `GET /api/v1/expenses/date-range/{year}/{month}`

Retrieves a list of active expenses for a given month and year.

**Parameters:**

-   `year` (integer, required): The year to filter by.
-   `month` (integer, required): The month to filter by.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "1adab14f-7101-46fa-9f50-876126178324",
    "amount": 108050,
    "description": "Facility BH (October)",
    "dueDate": "2025-10-02 00:30:00",
    "paidAt": null,
    "createdAt": "2025-10-18 02:33:21",
    "residentUnitId": null,
    "type": {
        "id": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
        "code": "MR1GE",
        "name": "MANUTENCAO_GERAL",
        "distributionMethod": "EQUAL",
        "description": "Pequenos reparos (hidráulica, elétrica em áreas comuns, chaveiro, etc.)."
    },
    "account": {
        "id": "6509f512-11f6-4f39-8457-e5e2ad9e221f",
        "code": "TRE23UY",
        "name": "Conta Principal",
        "description": "Esta é a conta principal do condominio, utilizada para gastos correntes.",
        "isActive": true
    },
    "recurringExpense": "79897837-2575-4830-b6c4-a42da653e413"
  }
]
```

### `GET /api/v1/expenses/date-range-recurring/{year}/{month}`

Retrieves a list of inactive expenses for a given month and year.

**Parameters:**

-   `year` (integer, required): The year to filter by.
-   `month` (integer, required): The month to filter by.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "d4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3d",
    "amount": 10000,
    "type": "services",
    "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
    "dueDate": "2023-11-15",
    "isActive": false,
    "description": "Monthly internet service",
    "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
  }
]
```

### `GET /api/v1/expense-types`

Retrieves a list of all expense types.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  "services",
  "maintenance",
  "supplies"
]
```

### `PUT /api/v1/recurring-expenses/create`

Creates a new recurring expense.

**Request Body:**

```json
{
  "id": "5509f512-11f6-4f39-8457-e5e2ad9e225f",
  "amount": 0,
  "type": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
  "accountId": "6509f512-11f6-4f39-8457-e5e2ad9e221f",
  "dueDay": 14,
  "monthsOfYear": [1,2,3,4,5,6,7,8,9,10,11,12],
  "description": "Conta da Cemig, valor variável",
  "hasPredefinedAmount": false
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the recurring expense (UUID format).
-   `amount` (integer, required): The expense amount (in cents).
-   `type` (string, required): The type of expense (UUID format).
-   `accountId` (string, required): The ID of the account associated with the expense.
-   `dueDay` (integer, required): The day of the month the expense is due.
-   `monthsOfYear` (array, required): An array of months in which the expense occurs (1-12).
-   `startDate` (string, required): The start date of the recurring expense (format: `YYYY-MM-DD`).
-   `endDate` (string, required): The end date of the recurring expense (format: `YYYY-MM-DD`).
-   `description` (string, optional): A description of the expense.
-   `notes` (string, optional): Additional notes about the expense.

**Responses:**

-   `201 Created`: The recurring expense was created successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `PATCH /api/v1/recurring-expenses/{id}`

Updates a recurring expense.

**Parameters:**

-   `id` (string, required): The unique identifier of the recurring expense to update.

**Request Body:**

```json
{
  "amount": 12000,
  "type": "utilities",
  "dueDay": 20,
  "monthsOfYear": [1, 4, 7, 10],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "description": "Quarterly electricity bill",
  "notes": "Updated notes"
}
```

**Parameters:**

-   `amount` (integer, optional): The new expense amount (in cents).
-   `type` (string, optional): The new type of expense (UUID format).
-   `dueDay` (integer, optional): The new day of the month the expense is due.
-   `monthsOfYear` (array, optional): The new array of months in which the expense occurs.
-   `startDate` (string, optional): The new start date of the recurring expense (format: `YYYY-MM-DD`).
-   `endDate` (string, optional): The new end date of the recurring expense (format: `YYYY-MM-DD`).
-   `description` (string, optional): The new description of the expense.
-   `notes` (string, optional): New additional notes about the expense.

**Responses:**

-   `204 No Content`: The recurring expense was updated successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `404 Not Found`: The specified recurring expense does not exist.

### `DELETE /api/v1/recurring-expenses/{id}`

Deletes a recurring expense.

**Parameters:**

-   `id` (string, required): The unique identifier of the recurring expense to delete.

**Responses:**

-   `204 No Content`: The recurring expense was deleted successfully.
-   `404 Not Found`: The specified recurring expense does not exist.

### `PUT /api/v1/recurring-expenses/enter-monthly`

Triggers the creation of monthly expenses based on existing recurring expense definitions for a specific month and year.

**Request Body:**

```json
{
  "month": 10,
  "year": 2025
}
```

**Body Parameters:**

-   `month` (integer, required): The month (1-12) for which to generate expenses.
-   `year` (integer, required): The year for which to generate expenses.

**Responses:**

-   `201 Created`: The expenses were generated successfully. The response body contains a list of the created expenses.
-   `400 Bad Request`: The request was malformed (e.g., invalid month or year).
-   `409 Conflict`: Expenses for this month have already been generated.

**Example Success Response:**

```json
{
  "message": "Monthly recurring expenses for 10/2025 have been successfully entered.",
  "count": 2,
  "totalAmount": 135000
}
```

### `GET /api/v1/recurring-expenses/pending-monthly/{month}/{year}`

Retrieves a list of recurring expenses that are scheduled to be paid in a given month and year but have not yet been entered as actual expenses.

**Path Parameters:**

-   `month` (integer, required): The month to filter by (1-12).
-   `year` (integer, required): The year to filter by.

**Responses:**

-   `200 OK`: The request was successful.

**Example Success Response:**

```json
[
  {
    "id": "c9e67e09-84ca-4c73-8f3d-6377d6d852db",
    "amount": 125000,
    "type": {
        "id": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
        "name": "MANUTENCAO_GERAL"
    },
    "account": {
        "id": "6509f512-11f6-4f39-8457-e5e2ad9e221f",
        "name": "Conta Principal"
    },
    "dueDay": 15,
    "description": "Monthly maintenance fee"
  }
]
```

### `GET /api/v1/recurring-expenses/year/{year}`

Retrieves a list of all recurring expenses active for a given year.

**Path Parameters:**

-   `year` (integer, required): The year to filter by.

**Responses:**

-   `200 OK`: The request was successful.

**Example Success Response:**

```json
[
  {
    "id": "c9e67e09-84ca-4c73-8f3d-6377d6d852db",
    "amount": 125000,
    "type": "f2266caa-0edf-4403-a1dd-d81e9a05c430",
    "accountId": "6509f512-11f6-4f39-8457-e5e2ad9e221f",
    "dueDay": 15,
    "monthsOfYear": [1,2,3,4,5,6,7,8,9,10,11,12],
    "description": "Monthly maintenance fee",
    "hasPredefinedAmount": true
  }
]
```

---

## Income

The Income context manages all incomes.

### `GET /api/v1/incomes/health-check`

Performs a health check of the Income context. This endpoint does not require authentication.

**Responses:**

-   `200 OK`: The service is healthy.

**Example Response:**

```json
{
  "status": 200
}
```

### `PUT /api/v1/incomes/enter`

Enters a new income.

**Request Body:**

```json
{
  "id": "1f0b8de4-809c-4586-aacd-254d0fde6eba",
  "residentUnitId": "674424a7-6009-42c0-a2da-6cc21a542bbd",
  "amount": 132000,
  "type": "6ed40f15-07a9-416a-99cf-bbb58348f4fd",
  "dueDate": "2025-10-21",
  "description": "Condominio de outubro"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the income (UUID format).
-   `residentUnitId` (string, required): The ID of the resident unit associated with the income (UUID format).
-   `amount` (integer, required): The income amount (in cents).
-   `type` (string, required): The type of income (UUID format).
-   `dueDate` (string, required): The due date of the income (format: `YYYY-MM-DD`).
-   `description` (string, optional): A description of the income.

**Responses:**

-   `201 Created`: The income was created successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `PATCH /api/v1/incomes/update/{id}`

Updates an income.

**Parameters:**

-   `id` (string, required): The unique identifier of the income to update.

**Request Body:**

```json
{
  "dueDate": "2023-11-05",
  "description": "Updated rent description"
}
```

**Parameters:**

-   `dueDate` (string, optional): The new due date of the income (format: `YYYY-MM-DD`).
-   `description` (string, optional): The new description of the income.

**Responses:**

-   `204 No Content`: The income was updated successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `404 Not Found`: The specified income does not exist.

### `PATCH /api/v1/incomes/payed/{id}`

Marks an income as paid.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the income to mark as paid (UUID format).

**Responses:**

-   `204 No Content`: The income was marked as paid successfully.
-   `404 Not Found`: The specified income does not exist.

### `GET /api/v1/incomes`

Retrieves a list of all incomes.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "1f0b8de4-809c-4586-aacd-254d0fde6eba",
    "amount": 132000,
    "residentUnitId": "674424a7-6009-42c0-a2da-6cc21a542bbd",
    "type": {
      "id": "6ed40f15-07a9-416a-99cf-bbb58348f4fd",
      "name": "Condominio",
      "code": "CON",
      "description": "Cuota de condominio"
    },
    "dueDate": "2025-10-21",
    "description": "Condominio de outubro"
  }
]
```

### `GET /api/v1/incomes/{id}`

Retrieves a single income by its ID.

**Path Parameters:**

-   `id` (string, required): The unique identifier of the income (UUID format).

**Responses:**

-   `200 OK`: The request was successful.
-   `404 Not Found`: The specified income does not exist.

**Example Success Response:**

```json
{
  "id": "1f0b8de4-809c-4586-aacd-254d0fde6eba",
  "amount": 132000,
  "residentUnitId": "674424a7-6009-42c0-a2da-6cc21a542bbd",
  "type": {
    "id": "6ed40f15-07a9-416a-99cf-bbb58348f4fd",
    "name": "Condominio",
    "code": "CON",
    "description": "Cuota de condominio"
  },
  "dueDate": "2025-10-21",
  "description": "Condominio de outubro"
}
```

### `GET /api/v1/incomes/date-range/{year}/{month}`

Retrieves a list of incomes for a given month and year.

**Parameters:**

-   `year` (integer, required): The year to filter incomes by.
-   `month` (integer, required): The month to filter incomes by.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "1f0b8de4-809c-4586-aacd-254d0fde6eba",
    "amount": 132000,
    "residentUnitId": "674424a7-6009-42c0-a2da-6cc21a542bbd",
    "type": {
      "id": "6ed40f15-07a9-416a-99cf-bbb58348f4fd",
      "name": "Condominio",
      "code": "CON",
      "description": "Cuota de condominio"
    },
    "dueDate": "2025-10-21",
    "description": "Condominio de outubro"
  }
]
```

### `GET /api/v1/incomes/date-range-recurring/{year}/{month}`

Retrieves a list of inactive (or not yet created) recurring incomes for a given month and year.

**Parameters:**

-   `year` (integer, required): The year to filter by.
-   `month` (integer, required): The month to filter by.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "d4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3d",
    "amount": 132000,
    "type": "Condominio",
    "residentUnitId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
    "dueDate": "2023-11-15",
    "isActive": false,
    "description": "Condominio de novembro"
  }
]
```

---

## Resident Unit

The Resident Unit context manages resident units and their occupants.

### `GET /api/v1/resident-unit/health-check`

Performs a health check of the Resident Unit context. This endpoint does not require authentication.

**Responses:**

-   `200 OK`: The service is healthy.

**Example Response:**

```json
{
  "status": 200
}
```

### `PUT /api/v1/resident-unit/create`

Creates a new resident unit.

**Request Body:**

```json
{
  "id": "h4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3h",
  "unit": "Apartment 102",
  "idealFraction": 5000,
  "notificationRecipients": [
    {
      "name": "Peter Jones",
      "email": "peter.jones@example.com"
    }
  ]
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the resident unit (UUID format).
-   `unit` (string, required): The name or number of the unit.
-   `idealFraction` (integer, required): The ideal fraction of the resident unit, represented as an integer with 4 decimal places (e.g., 5000 for 0.5).
-   `notificationRecipients` (array, optional): An array of notification recipients. Each recipient should be an object with `name` and `email` properties.

**Responses:**

-   `201 Created`: The resident unit was created successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `PUT /api/v1/resident-unit/create-with-recipients`

Creates a new resident unit with recipients. This endpoint is very similar to `PUT /api/v1/resident-unit/create`.

**Request Body:**

```json
{
  "id": "h4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3h",
  "unit": "Apartment 102",
  "idealFraction": 5000,
  "notificationRecipients": [
    {
      "name": "Peter Jones",
      "email": "peter.jones@example.com"
    }
  ]
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the resident unit (UUID format).
-   `unit` (string, required): The name or number of the unit.
-   `idealFraction` (integer, required): The ideal fraction of the resident unit, represented as an integer with 4 decimal places (e.g., 5000 for 0.5).
-   `notificationRecipients` (array, optional): An array of notification recipients. Each recipient should be an object with `name` and `email` properties.

**Responses:**

-   `201 Created`: The resident unit was created successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `GET /api/v1/resident-unit/actives`

Retrieves a list of active resident units.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e",
    "unit": "Apartment 101",
    "idealFraction": 5000
  },
  {
    "id": "f4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3f",
    "unit": "Apartment 102",
    "idealFraction": 5000
  }
]
```

### `PATCH /api/v1/resident-unit/{id}/recipients`

Appends a recipient to a resident unit.

**Parameters:**

-   `id` (string, required): The unique identifier of the resident unit.

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com"
}
```

**Parameters:**

-   `name` (string, required): The name of the recipient.
-   `email` (string, required): The email address of the recipient.

**Responses:**

-   `200 OK`: The recipient was appended successfully.
-   `404 Not Found`: The specified resident unit does not exist.

**Example Response:**

```json
{
  "id": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e",
  "unit": "Apartment 101",
  "idealFraction": 5000,
  "notificationRecipients": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    {
      "name": "Jane Doe",
      "email": "jane.doe@example.com"
    }
  ]
}
```

---

## Slip

The Slip context manages the generation and sending of slips.

### `GET /api/v1/slips/health-check`

Performs a health check of the Slip context. This endpoint does not require authentication.

**Responses:**

-   `200 OK`: The service is healthy.

**Example Response:**

```json
{
  "status": 200
}
```

### `POST /api/v1/slips/generation`

Generates slips for a specific month.

**Request Body:**

```json
{
  "targetMonth": "2023-11",
  "force": false
}
```

**Parameters:**

-   `targetMonth` (string, required): The target month for slip generation (format: `YYYY-MM`).
-   `force` (boolean, optional): Whether to force regeneration of slips if they already exist for the target month. Defaults to `false`.

**Responses:**

-   `201 Created`: The slip generation process was initiated successfully.
-   `400 Bad Request`: The request was malformed or validation failed.

### `POST /api/v1/slips/bulk-send`

Sends multiple slips in bulk.

**Request Body:**

```json
{
  "slip_ids": [
    "s4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3s",
    "t4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3t"
  ]
}
```

**Parameters:**

-   `slip_ids` (array, required): An array of slip IDs to send.

**Responses:**

-   `202 Accepted`: The request to send the slips in bulk was accepted.
-   `400 Bad Request`: The request was malformed or validation failed.

### `PATCH /api/v1/slips/send/{id}`

Sends a slip to the recipients.

**Parameters:**

-   `id` (string, required): The unique identifier of the slip to send.

**Responses:**

-   `202 Accepted`: The request to send the slip was accepted.
-   `404 Not Found`: The specified slip does not exist.
-   `409 Conflict`: The slip cannot be sent in its current state.

### `PATCH /api/v1/slips/pay/{id}`

Marks a slip as paid.

**Parameters:**

-   `id` (string, required): The unique identifier of the slip to mark as paid.

**Responses:**

-   `202 Accepted`: The request to mark the slip as paid was accepted.
-   `404 Not Found`: The specified slip does not exist.
-   `409 Conflict`: The slip cannot be marked as paid in its current state.

### `POST /api/v1/slips/check-total`

Checks if the total amount of a slip is within an expected range and generates an alert if it is not.

**Request Body:**

```json
{
  "amount": 750000
}
```

**Body Parameters:**

-   `amount` (integer, required): The total amount of the slip in cents.

**Responses:**

-   `200 OK`: The check was performed successfully. The status in the response body indicates the result.
-   `400 Bad Request`: The request was malformed (e.g., `amount` is missing).

**Example Success Response (Within Range):**

```json
{
    "status": "ok",
    "message": "O total do slip está dentro do intervalo esperado.",
    "amount": 750000
}
```

**Example Success Response (Anomaly Detected):**

```json
{
    "status": "alert_generated",
    "message": "<Generated alert message from AI>",
    "amount": 400000
}
```

---

## User

The User context manages users, authentication, and authorization.

### `GET /api/v1/users/health-check`

Performs a health check of the User context. This endpoint does not require authentication.

**Responses:**

-   `200 OK`: The service is healthy.

**Example Response:**

```json
{
  "status": 200
}
```

### `POST /api/v1/users/register`

Registers a new user.

**Request Body:**

```json
{
  "id": "w4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3w",
  "name": "New User",
  "email": "new.user@example.com",
  "password": "secure-password",
  "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the new user (UUID format).
-   `name` (string, required): The name of the user.
-   `email` (string, required): The email address of the user.
-   `password` (string, required): The password for the new user.
-   `residentUnitId` (string, optional): The ID of the resident unit to associate with the user.

**Responses:**

-   `201 Created`: The user was registered successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `409 Conflict`: A user with the specified email already exists.

### `GET /api/v1/users/activate/{userId}/{token}`

Activates a user account. This endpoint is typically used by clicking a link in an activation email and does not require an Authorization header.

**Parameters:**

-   `userId` (string, required): The unique identifier of the user to activate.
-   `token` (string, required): The activation token.

**Responses:**

-   `200 OK`: The user account was activated successfully.
-   `400 Bad Request`: The activation token is invalid or has expired.
-   `404 Not Found`: The specified user does not exist.

### `POST /api/v1/login_check`

Authenticates a user and returns a JWT token.

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "password"
}
```

**Parameters:**

-   `email` (string, required): The user's email address.
-   `password` (string, required): The user's password.

**Responses:**

-   `200 OK`: Authentication was successful.
-   `401 Unauthorized`: Invalid credentials.

**Example Response:**

```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
```

### `POST /api/v1/users/password-reset-request`

Requests a password reset for a user.

**Request Body:**

```json
{
  "email": "john.doe@example.com"
}
```

**Parameters:**

-   `email` (string, required): The email address of the user requesting the password reset.

**Responses:**

-   `200 OK`: The request was received. For security reasons, the response is the same whether the email exists in the system or not.

### `POST /api/v1/users/reset-password/{userId}/{token}`

Resets a user's password. This endpoint is typically used by clicking a link in a password reset email and does not require an Authorization header.

**Parameters:**

-   `userId` (string, required): The unique identifier of the user.
-   `token` (string, required): The password reset token.

**Request Body:**

```json
{
  "newPassword": "new-secure-password"
}
```

**Parameters:**

-   `newPassword` (string, required): The new password.

**Responses:**

-   `200 OK`: The password was reset successfully.
-   `400 Bad Request`: The reset token is invalid, has expired, or the new password is invalid.
-   `404 Not Found`: The specified user does not exist.

### `PATCH /api/v1/users/change-password`

Changes the password for the currently authenticated user.

**Request Body:**

```json
{
  "oldPassword": "current-password",
  "newPassword": "new-secure-password"
}
```

**Parameters:**

-   `oldPassword` (string, required): The user's current password.
-   `newPassword` (string, required): The new password.

**Responses:**

-   `200 OK`: The password was changed successfully.
-   `400 Bad Request`: The old password was incorrect or the new password is invalid.
-   `401 Unauthorized`: The user is not authenticated.

### `GET /api/v1/users`

Retrieves a list of all users.

**Responses:**

-   `200 OK`: The request was successful.

**Example Response:**

```json
[
  {
    "id": "u4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3u",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "roles": ["ROLE_USER"],
    "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
  },
  {
    "id": "v4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3v",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "roles": ["ROLE_USER", "ROLE_ADMIN"],
    "residentUnitId": null
  }
]
```

### `GET /api/v1/users/{id}`

Retrieves a single user by their ID.

**Parameters:**

-   `id` (string, required): The unique identifier of the user.

**Responses:**

-   `200 OK`: The request was successful.
-   `404 Not Found`: The specified user does not exist.

**Example Response:**

```json
{
  "id": "u4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3u",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "roles": ["ROLE_USER"],
  "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
}
```

### `PUT /api/v1/users/{id}`

Updates a user's profile information.

**Parameters:**

-   `id` (string, required): The unique identifier of the user to update.

**Request Body:**

```json
{
  "name": "Johnathan Doe"
}
```

**Parameters:**

-   `name` (string, optional): The user's updated name.

**Responses:**

-   `204 No Content`: The user was updated successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `404 Not Found`: The specified user does not exist.

### `PUT /api/v1/users/{id}/resident-unit`

Links a resident unit to a user.

**Parameters:**

-   `id` (string, required): The unique identifier of the user.

**Request Body:**

```json
{
  "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
}
```

**Parameters:**

-   `residentUnitId` (string, required): The unique identifier of the resident unit to link.

**Responses:**

-   `204 No Content`: The resident unit was linked successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `404 Not Found`: The specified user or resident unit does not exist.

### `DELETE /api/v1/users/{id}/resident-unit`

Unlinks a resident unit from a user.

**Parameters:**

-   `id` (string, required): The unique identifier of the user.

**Responses:**

-   `204 No Content`: The resident unit was unlinked successfully.
-   `404 Not Found`: The specified user does not exist.
