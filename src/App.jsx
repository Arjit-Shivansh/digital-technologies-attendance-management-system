import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { TeamDataProvider } from "./context/TeamDataContext";
import AppRoutes from "./AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamDataProvider>
          <AppRoutes />
        </TeamDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
