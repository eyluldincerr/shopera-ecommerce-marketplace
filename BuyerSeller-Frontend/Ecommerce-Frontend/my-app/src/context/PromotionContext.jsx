import React, { createContext, useContext, useState, useEffect } from "react";
import promotionAdapter from "../services/adapters/promotionAdapter.js";

const PromotionContext = createContext();

export const PromotionProvider = ({ children }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshActiveCampaigns = async () => {
    setLoading(true);
    try {
      const data = await promotionAdapter.getActiveCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to refresh promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshActiveCampaigns();
  }, []);

  return (
    <PromotionContext.Provider value={{ campaigns, loading, refreshActiveCampaigns }}>
      {children}
    </PromotionContext.Provider>
  );
};

export const usePromotion = () => useContext(PromotionContext);