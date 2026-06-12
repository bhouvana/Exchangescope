import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketSocketProvider } from "@/hooks/useMarketSocket";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import MarketOverview from "@/pages/MarketOverview";
import OrderBook from "@/pages/OrderBook";
import Pipeline from "@/pages/Pipeline";
import Control from "@/pages/Control";
import Replay from "@/pages/Replay";
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
            <Route path="/market" component={MarketOverview} />
            <Route path="/orderbook" component={OrderBook} />
            <Route path="/pipeline" component={Pipeline} />
            <Route path="/control" component={Control} />
            <Route path="/replay" component={Replay} />
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
        <MarketSocketProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </MarketSocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
