// Static single-page build for itch.io: no server, hash routing, relative asset paths.
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "../src/routeTree.gen";
import { Route as RootRoute } from "../src/routes/__root";
import "../src/styles.css";

// the Start shell renders <html>/<body>; in a plain SPA the page already has them
(RootRoute.options as { shellComponent?: unknown }).shellComponent = ({ children }: { children: ReactNode }) => <>{children}</>;

const router = createRouter({ routeTree, history: createHashHistory(), context: { queryClient: new QueryClient() }, scrollRestoration: true });
createRoot(document.getElementById("root")!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
