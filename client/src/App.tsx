import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserLogin from "./pages/UserLogin";
import HouseholdSelection from "./pages/HouseholdSelection";
import Shopping from "./pages/Shopping";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import Projects from "./pages/Projects";
import History from "./pages/History";
import Neighborhood from "./pages/Neighborhood";
import Members from "./pages/Members";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/user-login" component={UserLogin} />
      <Route path="/household-selection" component={HouseholdSelection} />
      <Route path="/shopping" component={Shopping} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/projects" component={Projects} />
      <Route path="/history" component={History} />
      <Route path="/neighborhood" component={Neighborhood} />
      <Route path="/members" component={Members} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <UserAuthProvider>
          <AuthProvider>
            <TooltipProvider>
            <Toaster />
            <Router />
            </TooltipProvider>
          </AuthProvider>
        </UserAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
