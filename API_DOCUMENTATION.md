# API Documentation

This document provides a detailed overview of the API endpoints available for client frontends.

## Authentication

All API endpoints are protected and require a valid JSON Web Token (JWT) to be sent in the `Authorization` header.

```
Authorization: Bearer <your_jwt_token>
```

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

**Example Response:**

```json
[
  {
    "id": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
    "code": "1.01.01",
    "name": "Cash",
    "balance": 1500.75,
    "isActive": true,
    "createdAt": "2023-10-27T10:00:00+00:00",
    "updatedAt": "2023-10-27T10:00:00+00:00"
  },
  {
    "id": "c3e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3c",
    "code": "1.01.02",
    "name": "Savings",
    "balance": 5000.00,
    "isActive": true,
    "createdAt": "2023-10-27T10:00:00+00:00",
    "updatedAt": "2023-10-27T10:00:00+00:00"
  }
]
```

### `GET /api/v1/accounts/{id}`

Retrieves a single account by its ID.

**Parameters:**

-   `id` (string, required): The unique identifier of the account.

**Responses:**

-   `200 OK`: The request was successful.
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
  "type": "services",
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
-   `type` (string, required): The type of expense (e.g., "services", "maintenance").
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
  "type": "services",
  "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "dueDate": "2023-11-15",
  "description": "Monthly internet service"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the expense (UUID format).
-   `amount` (integer, required): The expense amount (in cents).
-   `type` (string, required): The type of expense (e.g., "services", "maintenance").
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
    "id": "d4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3d",
    "amount": 10000,
    "type": "services",
    "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
    "dueDate": "2023-11-15",
    "isActive": true,
    "description": "Monthly internet service",
    "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
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
  "id": "d4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3d",
  "amount": 10000,
  "type": "services",
  "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "dueDate": "2023-11-15",
  "isActive": true,
  "description": "Monthly internet service",
  "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
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

-   `amount` (integer, optional): The amount to compensate. If not provided, the full amount of the expense will be compensated.

**Responses:**

-   `204 No Content`: The expense was compensated successfully.
-   `404 Not Found`: The specified expense does not exist.

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
    "id": "d4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3d",
    "amount": 10000,
    "type": "services",
    "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
    "dueDate": "2023-11-15",
    "isActive": true,
    "description": "Monthly internet service",
    "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e"
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
  "id": "f4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3f",
  "amount": 10000,
  "type": "services",
  "accountId": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "dueDay": 15,
  "monthsOfYear": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  "startDate": "2023-01-01",
  "endDate": "2023-12-31",
  "description": "Monthly internet service",
  "notes": "Recurring expense for internet"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the recurring expense (UUID format).
-   `amount` (integer, required): The expense amount (in cents).
-   `type` (string, required): The type of expense (e.g., "services", "maintenance").
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

-   `amount` (integer, optional): The new expense amount (in cents).
-   `type` (string, optional): The new type of expense.
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

---

## Income

The Income context manages all incomes.

### `PUT /api/v1/incomes/enter`

Enters a new income.

**Request Body:**

```json
{
  "id": "g4e8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3g",
  "residentUnitId": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e",
  "amount": 50000,
  "type": "rent",
  "dueDate": "2023-11-01",
  "description": "Monthly rent"
}
```

**Parameters:**

-   `id` (string, required): The unique identifier for the income (UUID format).
-   `residentUnitId` (string, required): The ID of the resident unit associated with the income.
-   `amount` (integer, required): The income amount (in cents).
-   `type` (string, required): The type of income (e.g., "rent", "fees").
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

-   `dueDate` (string, optional): The new due date of the income (format: `YYYY-MM-DD`).
-   `description` (string, optional): The new description of the income.

**Responses:**

-   `204 No Content`: The income was updated successfully.
-   `400 Bad Request`: The request was malformed or validation failed.
-   `404 Not Found`: The specified income does not exist.

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
  "idealFraction": 0.5,
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
-   `idealFraction` (float, required): The ideal fraction of the resident unit.
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
  "idealFraction": 0.5,
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
-   `idealFraction` (float, required): The ideal fraction of the resident unit.
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
    "idealFraction": 0.5
  },
  {
    "id": "f4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3f",
    "unit": "Apartment 102",
    "idealFraction": 0.5
  }
]
```

### `GET /api/v1/resident-unit/{id}`

Retrieves a single resident unit by its ID.

**Parameters:**

-   `id` (string, required): The unique identifier of the resident unit.

**Responses:**

-   `200 OK`: The request was successful.
-   `404 Not Found`: The specified resident unit does not exist.

---

## Slip

The Slip context manages the generation and sending of slips.

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
  "username": "john.doe@example.com",
  "password": "password"
}
```

**Parameters:**

-   `username` (string, required): The user's email address.
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
  "name": "Johnathan",
  "lastName": "Doe",
  "gender": "male",
  "phoneNumber": "1234567890"
}
```

-   `name` (string, required): The user's first name.
-   `lastName` (string, required): The user's last name.
-   `gender` (string, required): The user's gender.
-   `phoneNumber` (string, required): The user's phone number.

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

**Example Response:**

```json
{
  "id": "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e",
  "name": "Apartment 101",
  "recipients": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  ]
}
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

-   `name` (string, required): The name of the recipient.
-   `email` (string, required): The email address of the recipient.

**Responses:**

-   `200 OK`: The recipient was appended successfully.
-   `404 Not Found`: The specified resident unit does not exist.


**Example Response:**

```json
{
  "id": "a7b7b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3b",
  "code": "1.01.01",
  "name": "Cash",
  "balance": 1500.75,
  "isActive": true,
  "createdAt": "2023-10-27T10:00:00+00:00",
  "updatedAt": "2023-10-27T10:00:00+00:00"
}
```
