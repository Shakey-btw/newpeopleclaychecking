"use client";

import { useState, useEffect } from "react";
import TopLeftNav from "@/components/navigation/TopLeftNav";

interface OverviewCampaign {
  id: string;
  name: string;
  status: string;
  unique_companies: number;
  total_leads: number;
  ratio: number;
}

export default function Overview() {
  const [campaigns, setCampaigns] = useState<OverviewCampaign[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isCopyingCompanies, setIsCopyingCompanies] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Navigation items for this page
  const navItems = [
    { id: "network-commit", label: "NETWORK UPLOAD", href: "/network-commit" },
    { id: "company-checking", label: "PEOPLE CHECKING", href: "/company-checking" },
    { id: "push-activity", label: "PUSH ACTIVITY", href: "/push-activity" },
    { id: "approach", label: "APPROACH", href: "/approach" },
  ];

  const fetchData = async () => {
    try {
      const response = await fetch('/api/overview');
      const data = await response.json();
      
      if (data.success) {
        setCampaigns(data.campaigns || []);
        setLastUpdate(data.lastUpdate);
      } else {
        console.error('Failed to fetch overview data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'sync' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh data after sync
        await fetchData();
        console.log('Sync completed:', data.stats);
        
        // Show checkmark for 2 seconds
        setShowCheckmark(true);
        setTimeout(() => {
          setShowCheckmark(false);
        }, 2000);
      } else {
        console.error('Failed to sync data:', data.error);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyCompanies = async () => {
    try {
      setIsCopyingCompanies(true);
      const response = await fetch('/api/overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get-companies' }),
      });
      
      const data = await response.json();
      
      if (data.success && data.companies) {
        // Copy companies to clipboard, one per line
        const companiesText = data.companies.join('\n');
        await navigator.clipboard.writeText(companiesText);
        
        // Show success message for 2 seconds
        setShowCopySuccess(true);
        setTimeout(() => {
          setShowCopySuccess(false);
        }, 2000);
        
        console.log(`Copied ${data.companies.length} companies to clipboard`);
      } else {
        console.error('Failed to get companies:', data.error);
      }
    } catch (error) {
      console.error('Error copying companies:', error);
    } finally {
      setIsCopyingCompanies(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatRatio = (ratio: number) => {
    return Math.round(ratio).toString();
  };

  const getTotalStats = () => {
    const totalCompanies = campaigns.reduce((sum, campaign) => sum + campaign.unique_companies, 0);
    const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.total_leads, 0);
    const overallRatio = totalCompanies > 0 ? Math.round(totalLeads / totalCompanies) : 0;
    
    return {
      totalCompanies,
      totalLeads,
      overallRatio
    };
  };

  const round = (num: number, decimals: number) => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  const stats = getTotalStats();

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6">
      {/* Top Left Navigation */}
      <div className="absolute top-[40px] left-6">
        <TopLeftNav items={navItems} />
      </div>
      
      {/* Top Right Buttons */}
      <div className="absolute top-[40px] right-6 flex items-center gap-4">
        {/* Copy Companies Button */}
        <button
          onClick={handleCopyCompanies}
          disabled={isCopyingCompanies}
          className={`text-[12px] tracking-[0.03em] leading-[16px] uppercase font-light text-right pr-4 transition-colors ${
            isCopyingCompanies
              ? 'text-gray-600 cursor-not-allowed'
              : showCopySuccess
              ? 'text-gray-600'
              : 'text-gray-400 cursor-pointer hover:text-gray-600'
          }`}
        >
          {showCopySuccess ? (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 text-black">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              </div>
              <span className="text-[12px] tracking-[0.03em] leading-[16px] uppercase font-light text-gray-600">copied</span>
            </div>
          ) : (
            'COPY COMPANIES'
          )}
        </button>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`text-[12px] tracking-[0.03em] leading-[16px] uppercase font-light text-right pr-4 transition-colors ${
            isSyncing
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-400 cursor-pointer hover:text-gray-600'
          }`}
        >
          {isSyncing ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-400 border-t-black rounded-full animate-spin"></div>
              <span className="text-[12px] tracking-[0.03em] leading-[16px] uppercase font-light text-gray-600">syncing all</span>
            </div>
          ) : showCheckmark ? (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 text-black">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              </div>
              <span className="text-[12px] tracking-[0.03em] leading-[16px] uppercase font-light text-gray-600">successful</span>
            </div>
          ) : (
            'SYNC'
          )}
        </button>
      </div>
      
      <div className="mx-auto" style={{ paddingTop: '16px', maxWidth: 'calc(896px - 200px)' }}>

        {/* Total Stats */}
        <div className="mb-10">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-2xl font-light text-black mb-1">
                {stats.totalCompanies.toLocaleString()}
              </div>
              <div className="text-xs font-light text-gray-600 uppercase tracking-wide">
                COMPANIES
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-black mb-1">
                {stats.totalLeads.toLocaleString()}
              </div>
              <div className="text-xs font-light text-gray-600 uppercase tracking-wide">
                TOTAL LEADS
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-black mb-1">
                {formatRatio(stats.overallRatio)}
              </div>
              <div className="text-xs font-light text-gray-600 uppercase tracking-wide">
                PEOPLE PER COMPANY
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="mb-12 pt-2">
          {campaigns.length === 0 ? (
            <div className="border-t border-gray-200 py-2">
              <div className="text-xs text-gray-500">No campaigns found</div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Table Headings */}
              <div className="flex items-center text-xs font-light text-gray-500 border-b border-gray-200 pb-2">
                <span className="flex-1">Campaigns</span>
                <div className="flex items-center gap-12 w-56 justify-end">
                  <span className="w-16 text-right">Companies</span>
                  <span className="w-16 text-right">Leads</span>
                  <span className="w-12 text-right">Ratio</span>
                </div>
              </div>
              
              {campaigns.map((campaign, index) => (
                <div
                  key={index}
                  className={`flex items-center text-xs font-light text-black ${
                    index === 0 
                      ? 'border-b border-gray-100' 
                      : 'border-b border-gray-100 last:border-b-0'
                  }`}
                  style={{
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    lineHeight: '16px'
                  }}
                >
                  <span className="flex-1">
                    {campaign.name}
                  </span>
                  <div className="flex items-center gap-12 w-56 justify-end text-gray-500">
                    <span className="w-16 text-right">
                      {campaign.unique_companies.toLocaleString()}
                    </span>
                    <span className="w-16 text-right">
                      {campaign.total_leads.toLocaleString()}
                    </span>
                    <span className="w-12 text-right">
                      {formatRatio(campaign.ratio)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="text-xs text-gray-400">
            Last updated: {new Date(lastUpdate).toLocaleString()}
          </div>
        )}
      </div>
    </main>
  );
}
