import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RouteFallback from "./components/common/RouteFallback";

const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Incomes = lazy(() => import("./pages/Incomes"));
const Expenses = lazy(() => import("./pages/Expenses"));
const ResidentUnits = lazy(() => import("./pages/ResidentUnits"));
const Users = lazy(() => import("./pages/Users"));
const Slips = lazy(() => import("./pages/Slips"));
const RecurringExpenses = lazy(() => import("./pages/RecurringExpenses"));
const Previsao = lazy(() => import("./pages/Previsao"));

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Home />} />

              <Route path="/profile" element={<UserProfile />} />

              <Route path="/contas" element={<Accounts />} />
              <Route path="/ingressos" element={<Incomes />} />
              <Route path="/despesas" element={<Expenses />} />
              <Route path="/recurring-expenses" element={<RecurringExpenses />} />
              <Route path="/unidades-residenciais" element={<ResidentUnits />} />
              <Route path="/boletos" element={<Slips />} />
              <Route path="/previsao" element={<Previsao />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/configuracoes" element={<Navigate to="/boletos" replace />} />
            </Route>
          </Route>

          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
