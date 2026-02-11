import { useState } from "react";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import Collection from "@/pages/Collection";

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const navigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
      {currentPage === 'home' && <Home onNavigate={navigate} />}
      {currentPage === 'browse' && <Browse onNavigate={navigate} />}
      {currentPage === 'collection' && <Collection onNavigate={navigate} />}
    </>
  );
}
