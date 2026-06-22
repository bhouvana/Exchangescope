import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketSocketProvider } from "@/hooks/useMarketSocket";
import { LearnProvider } from "@/context/LearnContext";
import { RegionProvider } from "@/context/RegionContext";
import { AuthProvider } from "@/context/AuthContext";
import { SimulatedTradersProvider } from "@/context/SimulatedTradersContext";
import { OnboardingModal } from "@/components/learn/OnboardingModal";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import MarketOverview from "@/pages/MarketOverview";
import OrderBook from "@/pages/OrderBook";
import Pipeline from "@/pages/Pipeline";
import Control from "@/pages/Control";
import Replay from "@/pages/Replay";
import TradeTape from "@/pages/TradeTape";
import SectorHeatmap from "@/pages/SectorHeatmap";
import AiTraders from "@/pages/AiTraders";
import Analytics from "@/pages/Analytics";
import Academy from "@/pages/Academy";
import Reports from "@/pages/Reports";
import MarketIntelligence from "@/pages/MarketIntelligence";
import ResearchLab from "@/pages/ResearchLab";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 500,
      retry: 1,
    },
  },
});

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/academy" component={Academy} />
            <Route path="/market" component={MarketOverview} />
            <Route path="/sectors" component={SectorHeatmap} />
            <Route path="/tape" component={TradeTape} />
            <Route path="/orderbook" component={OrderBook} />
            <Route path="/pipeline" component={Pipeline} />
            <Route path="/control" component={Control} />
            <Route path="/traders" component={AiTraders} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/replay" component={Replay} />
            <Route path="/reports" component={Reports} />
            <Route path="/intelligence" component={MarketIntelligence} />
            <Route path="/research" component={ResearchLab} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RegionProvider>
          <AuthProvider>
            <LearnProvider>
              <MarketSocketProvider>
                <SimulatedTradersProvider>
                  <OnboardingModal />
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <AppRoutes />
                  </WouterRouter>
                  <Toaster />
                </SimulatedTradersProvider>
              </MarketSocketProvider>
            </LearnProvider>
          </AuthProvider>
        </RegionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
