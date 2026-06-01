# Frontend Architecture and Code Patterns

This document explains the architecture and main code patterns for the Matisse frontend. The goal is to keep the code simple, consistent, and easy to maintain. Following these rules is important for team collaboration and for the long-term health of the project.

## 1. Project Structure

The `src` folder is organized by feature and function.

-   `/components`: Contains reusable React components.
    -   `/common`: Basic, general-purpose components (e.g., `PageMeta`, `ComponentCard`).
    -   `/modal`: All modal dialog components.
    -   `/ui`: Small UI elements like `Badge` or `Switch`.
    -   Components related to a specific feature (e.g., `/dashboard`, `/slips`) are in their own sub-folder.
-   `/pages`: Contains the main component for each page of the application (e.g., `Dashboard.tsx`, `Accounts.tsx`).
-   `/hooks`: Contains all custom hooks, especially for data fetching and mutations with TanStack Query.
-   `/types`: Contains all TypeScript type definitions, shared across the application.
-   `/utils`: Contains utility functions (e.g., `formatCurrency`).
-   `/layout`: Main layout components of the application.
-   `/context`: For React Context providers (e.g., `ThemeContext`).

## 2. API Documentation (`API_DOC.md`)

The `API_DOC.md` file is the **single source of truth** for all API endpoints. It details the required parameters, request bodies, and expected responses for every API call.

**Importance:**
-   **Clarity:** Before writing any data-fetching code, check this document to understand the API contract.
-   **Consistency:** It ensures that the frontend and backend are aligned.
-   **Debugging:** When an API call fails, this document is the first place to check if the frontend is sending the correct data structure.

**Rule:** **Always consult `API_DOC.md` before implementing any new query or mutation.**

## 3. Server State Management: TanStack Query

We use **TanStack Query** to manage all data that comes from the server.

**Why?** It simplifies asynchronous state management (like `loading`, `error` states), provides a smart cache to make the app feel faster, and automatically updates the UI when data changes.

---

## 4. Implementation Patterns

### 4.1. Fetching Data (Queries)

To **get** data from the server (GET requests), always use the `useQuery` hook.

**Rules:**
-   The `fetch` function logic should be outside the React component.
-   The `queryKey` must be an array that uniquely identifies the data.
-   The component should use the `isLoading`, `isError`, and `data` states provided by the hook.

**Example (`src/pages/Users.tsx`):**

```typescript
// --- Fetching Function (outside the component) ---
const fetchUsers = async (): Promise<User[]> => {
  // ... logic to get users from the API ...
};

// --- Component ---
export default function Users() {
  const { data: users = [], isLoading, isError, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (isLoading) return <p>Carregando...</p>;
  if (isError) return <p>Error: {error.message}</p>;

  return <DataTable data={users} />;
}
```

### 4.2. Changing Data (Mutations)

To **change** data on the server (POST, PUT, PATCH, DELETE requests), always use the `useMutation` hook.

**Rules:**
-   The mutation logic (the API call) should be in a separate function.
-   Use the `useMutation` hook to manage states like `isLoading`.
-   **Important:** In the `onSuccess` callback, call `queryClient.invalidateQueries` to mark the affected data as "old". This tells TanStack Query to refetch it automatically, which updates the UI.

**Example (`src/hooks/useGenerateSlips.ts`):**

```typescript
const generateSlipsAPI = async (payload: GenerateSlipsPayload) => {
  // ... logic for the POST request to /api/v1/slips/generation ...
};

export const useGenerateSlips = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateSlipsAPI,
    onSuccess: () => {
      // Invalidate affected queries to update them automatically.
      queryClient.invalidateQueries({ queryKey: ['slipsData'] });
      queryClient.invalidateQueries({ queryKey: ['pendingBills'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyMetrics'] });
    },
  });
};
```

### 4.3. Custom Hooks

To keep components clean and reuse data logic, we should wrap `useQuery` and `useMutation` in **custom hooks**. These hooks should be saved in the `src/hooks/` directory.

-   **For Queries:** `use[DataName]` (e.g., `useSlipsData`, `useMonthlyMetrics`).
-   **For Mutations:** `use[Action]` (e.g., `useGenerateSlips`, `useSaveGasPrice`).

This is the preferred pattern for all new features.

## 5. TypeScript Types

All shared types, especially for API responses, should be defined in the `/types` directory. This ensures type safety and consistency across the application. When creating a new query or mutation, first ensure that the corresponding types exist.
