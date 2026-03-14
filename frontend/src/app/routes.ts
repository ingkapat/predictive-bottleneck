import { createBrowserRouter } from "react-router";
import Dashboard from "./pages/Dashboard";
import StationDetail from "./pages/StationDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Dashboard,
  },
  {
    path: "/station/:id",
    Component: StationDetail,
  }
]);
