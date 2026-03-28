import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Home from "./pages/Home";

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
import Inventory from "./pages/Inventory";
import InventoryDetail from "./pages/InventoryDetail";
import Borrows from "./pages/Borrows";
import { Privacy } from "./pages/Privacy";
import Imprint from "./pages/Imprint";
import HouseholdSettings from "./pages/HouseholdSettings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={UserLogin} />

      <Route path="/register" component={Register} />
      <Route path="/household-selection" component={HouseholdSelection} />
      <Route path="/shopping" component={Shopping} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/projects" component={Projects} />
      <Route path="/history" component={History} />
      <Route path="/neighborhood" component={Neighborhood} />
      <Route path="/members" component={Members} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory/:id" component={InventoryDetail} />
      <Route path="/borrows" component={Borrows} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/imprint" component={Imprint} />
      <Route path="/settings" component={HouseholdSettings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** RTL_LANGUAGES: add new RTL language codes here when adding new languages */
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

function DirectionManager() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const lang = i18n.language?.split("-")[0] ?? "de";
    const isRtl = RTL_LANGUAGES.has(lang);
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [i18n.language]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <UserAuthProvider>
          <TooltipProvider>
            <DirectionManager />
            <Toaster />
            <Router />
          </TooltipProvider>
        </UserAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
