# AI Development Rules

This document outlines the technology stack and provides clear guidelines for the AI assistant on which libraries to use for specific functionalities within this project.

## Tech Stack

This project is built with a modern, type-safe, and efficient stack:

-   **Framework**: React with Vite for a fast development experience.
-   **Language**: TypeScript for type safety and improved code quality.
-   **Styling**: Tailwind CSS for a utility-first styling approach.
-   **UI Components**: A comprehensive set of pre-built, accessible components from `shadcn/ui`.
-   **Routing**: `react-router-dom` for client-side navigation.
-   **Data Fetching & State**: `@tanstack/react-query` for managing server state, caching, and data synchronization.
-   **Forms**: `react-hook-form` for performant and flexible form handling.
-   **Schema Validation**: `zod` for powerful schema definition and validation.
-   **Icons**: `lucide-react` for a wide range of beautiful and consistent icons.
-   **Charts**: `recharts` for creating data visualizations.

## Library Usage Rules

To maintain consistency and quality, please adhere to the following rules:

-   **UI Components**: **Always** use components from the `shadcn/ui` library (`@/components/ui/*`) when available. If a required component does not exist, create a new custom component in `src/components/` following the existing project structure and styling conventions.
-   **Styling**: Use Tailwind CSS utility classes for all styling. The `cn` utility function from `@/lib/utils.ts` should be used to conditionally apply classes. Avoid writing custom CSS in `.css` files unless absolutely necessary.
-   **Routing**: All client-side routing must be handled by `react-router-dom`. Routes should be defined in `src/App.tsx`.
-   **State Management**:
    -   For **server state** (data fetching, caching, mutations), **always** use `@tanstack/react-query`.
    -   For simple, local **client state**, use React's built-in hooks (`useState`, `useReducer`, `useContext`). Avoid introducing complex global state management libraries like Redux or Zustand unless the application's complexity demands it.
-   **Forms**: All forms must be built using `react-hook-form`.
-   **Validation**: Use `zod` to define validation schemas. These schemas should be integrated with `react-hook-form` using the `@hookform/resolvers` package.
-   **Icons**: Only use icons from the `lucide-react` library to ensure visual consistency.
-   **Charts & Data Visualization**: Use the `recharts` library for any charts or graphs.
-   **Notifications**: Use `sonner` for toast notifications to provide feedback to the user. The `Toaster` is already set up in `App.tsx`.