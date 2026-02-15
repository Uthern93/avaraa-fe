import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import { AuthProviderWrapper } from "./app/components/auth";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProviderWrapper>
    <RouterProvider router={router} />
  </AuthProviderWrapper>
);