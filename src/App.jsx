import { useState } from "react";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import Collection from "@/pages/Collection";
import Leaderboards from "@/pages/Leaderboards";
import { featureFlags } from "@/config/featureFlags";

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const navigate = (page) => {
    if (page === 'leaderboards' && !featureFlags.leaderboards) return;
    setCurrentPage(page);
  };

  return (
    <>
      {currentPage === 'home' && <Home onNavigate={navigate} />}
      {currentPage === 'browse' && <Browse onNavigate={navigate} />}
      {currentPage === 'collection' && <Collection onNavigate={navigate} />}
      {currentPage === 'leaderboards' && featureFlags.leaderboards && (
        <Leaderboards onNavigate={navigate} />
      )}
    </>
  );
}
