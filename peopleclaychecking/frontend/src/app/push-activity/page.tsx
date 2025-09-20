"use client";

import { useState, useEffect } from "react";
import TopLeftNav from "@/components/navigation/TopLeftNav";

interface Campaign {
  id: string;
  name: string;
  status: string;
  unique_company_count: number;
  company_count_change?: number;
  has_new_companies?: boolean;
}

interface ChangeLogEntry {
  change_type: string;
  campaign_name: string;
  lead_email?: string;
  lead_company?: string;
  old_value?: string;
  new_value?: string;
  change_timestamp: string;
  details?: string;
}

export default function PushActivity() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [leadChanges, setLeadChanges] = useState<{
    leadsAdded: number;
    leadsRemoved: number;
    companyCountChanges: { [key: string]: number };
    addedLeads: any[];
    removedLeads: any[];
  } | null>(null);
  const [pushStatus, setPushStatus] = useState<{ [key: string]: any }>({});
  const [pushing, setPushing] = useState<{ [key: string]: boolean }>({});
  const [showConfirmModal, setShowConfirmModal] = useState<{ campaignId: string; action: 'push_all' | 'push_new'; companyCount: number } | null>(null);

  // Navigation items for this page
  const navItems = [
    { id: "network-commit", label: "NETWORK UPLOAD", href: "/network-commit" },
    { id: "company-checking", label: "PEOPLE CHECKING", href: "/company-checking" },
    { id: "push-activity", label: "PUSH ACTIVITY", href: "/push-activity" },
    { id: "approach", label: "APPROACH", href: "/approach" },
  ];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch campaigns and change log in parallel
      const [campaignsResponse, changelogResponse] = await Promise.all([
        fetch('/api/push-activity'),
        fetch('/api/push-activity/changelog?limit=20')
      ]);
      
      const campaignsData = await campaignsResponse.json();
      const changelogData = await changelogResponse.json();
      
      if (campaignsData.success) {
        setCampaigns(campaignsData.campaigns || []);
        setLastUpdate(new Date().toISOString());
      } else {
        console.error('Failed to fetch campaigns:', campaignsData.error);
      }
      
      if (changelogData.success) {
        setChangeLog(changelogData.changeLog || []);
      } else {
        console.error('Failed to fetch change log:', changelogData.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/push-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'update' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store lead changes
        if (data.stats) {
          setLeadChanges({
            leadsAdded: data.stats.leadsAdded || 0,
            leadsRemoved: data.stats.leadsRemoved || 0,
            companyCountChanges: data.stats.companyCountChanges || {},
            addedLeads: data.stats.addedLeads || [],
            removedLeads: data.stats.removedLeads || []
          });
        }
        
        // Refresh the data after update
        await fetchData();
        console.log('Update completed:', data.stats);
      } else {
        console.error('Failed to update campaigns:', data.error);
      }
    } catch (error) {
      console.error('Error updating campaigns:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePushAll = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    const pushStatusData = pushStatus[campaignId];
    
    if (campaign && pushStatusData) {
      setShowConfirmModal({
        campaignId,
        action: 'push_all',
        companyCount: pushStatusData.total_companies || campaign.unique_company_count
      });
    }
  };

  const handlePushNew = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    const pushStatusData = pushStatus[campaignId];
    
    if (campaign && pushStatusData) {
      setShowConfirmModal({
        campaignId,
        action: 'push_new',
        companyCount: pushStatusData.new_companies || 0
      });
    }
  };

  const fetchPushStatus = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/push-activity/status?campaignId=${campaignId}`);
      const data = await response.json();
      
      if (data.success) {
        setPushStatus(prev => ({
          ...prev,
          [campaignId]: data.result
        }));
      }
    } catch (error) {
      console.error('Error fetching push status:', error);
    }
  };

  const fetchChangeLog = async () => {
    try {
      const response = await fetch('/api/push-activity/changelog');
      const data = await response.json();
      
      if (data.success) {
        setChangeLog(data.changeLog || []);
      }
    } catch (error) {
      console.error('Error fetching change log:', error);
    }
  };

  const executePush = async (campaignId: string, action: 'push_all' | 'push_new') => {
    try {
      setPushing(prev => ({ ...prev, [campaignId]: true }));
      
      const response = await fetch('/api/push-activity/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          campaignId, 
          action 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`${action} successful:`, data.result);
        // Refresh push status
        await fetchPushStatus(campaignId);
        // Refresh change log to show the push activity
        await fetchChangeLog();
      } else {
        console.error(`Failed to ${action} companies:`, data.error);
      }
    } catch (error) {
      console.error(`Error ${action} companies:`, error);
    } finally {
      setPushing(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const confirmPush = async () => {
    if (!showConfirmModal) return;
    
    const { campaignId, action } = showConfirmModal;
    setShowConfirmModal(null);
    await executePush(campaignId, action);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch push status for all campaigns when campaigns change
  useEffect(() => {
    if (campaigns.length > 0) {
      campaigns.forEach(campaign => {
        fetchPushStatus(campaign.id);
      });
    }
  }, [campaigns]);

  const formatChangeType = (changeType: string) => {
    switch (changeType) {
      case 'campaign_added':
        return 'Campaign added';
      case 'campaign_removed':
        return 'Campaign removed';
      case 'campaign_updated':
        return 'Campaign updated';
      case 'lead_added':
        return 'Lead added';
      case 'lead_removed':
        return 'Lead removed';
      case 'lead_updated':
        return 'Lead updated';
      case 'company_count_changed':
        return 'Company count changed';
      case 'push_all':
        return 'PUSH ALL';
      case 'push_new':
        return 'PUSH NEW';
      default:
        return changeType;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6">
      {/* Top Left Navigation */}
      <div className="absolute top-[40px] left-6">
        <TopLeftNav items={navItems} />
      </div>
      
      <div className="mx-auto max-w-4xl pt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-light text-black mb-2">PUSH ACTIVITY</h1>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {isLoading ? 'Loading...' : `${campaigns.length} campaigns with company data`}
            </p>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || isLoading}
              className={`px-4 py-2 text-xs font-light border border-black transition-colors ${
                isUpdating || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              {isUpdating ? 'UPDATING...' : 'UPDATE'}
            </button>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="mb-12">
          {isLoading ? (
            <div className="text-xs text-gray-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-xs text-gray-500">No campaigns found</div>
          ) : (
            <div className="space-y-1">
              {campaigns.map((campaign, index) => {
                const companyChange = leadChanges?.companyCountChanges?.[campaign.name] || 0;
                const status = pushStatus[campaign.id];
                const isPushing = pushing[campaign.id] || false;
                const hasEverBeenPushed = status?.has_ever_been_pushed || false;
                const showPushNew = status?.show_push_new || false;
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs font-light text-black py-1 border-b border-gray-100 last:border-b-0"
                  >
                    <span>{campaign.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{campaign.unique_company_count}</span>
                      {companyChange !== 0 && (
                        <span className={`text-xs ${companyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {companyChange > 0 ? '+' : ''}{companyChange}
                        </span>
                      )}
                      
                      {/* Push Buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handlePushAll(campaign.id)}
                          disabled={isPushing}
                          className={`px-2 py-1 text-xs font-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            hasEverBeenPushed 
                              ? 'border border-black bg-white text-black hover:bg-black hover:text-white'
                              : 'bg-black text-white hover:bg-gray-800'
                          }`}
                        >
                          {isPushing ? 'PUSHING...' : 'PUSH ALL'}
                        </button>
                        
              {showPushNew && (
                <button
                  onClick={() => handlePushNew(campaign.id)}
                  disabled={isPushing}
                  className="px-2 py-1 text-xs font-light bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPushing ? 'PUSHING...' : `PUSH NEW (${pushStatus[campaign.id]?.new_companies || 0})`}
                </button>
              )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lead Changes */}
        {leadChanges && (leadChanges.leadsAdded > 0 || leadChanges.leadsRemoved > 0) && (
          <div className="mb-6">
            <h2 className="text-xs font-light text-black mb-4 uppercase tracking-wide">
              RECENT CHANGES
            </h2>
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Leads:</span> +{leadChanges.leadsAdded} added, -{leadChanges.leadsRemoved} removed
              </div>
              
              {Object.keys(leadChanges.companyCountChanges).length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Company Count Changes:</span>
                  <div className="ml-2 mt-1">
                    {Object.entries(leadChanges.companyCountChanges).map(([campaign, change]) => (
                      <div key={campaign} className="text-[10px]">
                        {campaign}: <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {leadChanges.addedLeads.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Sample Added Leads:</span>
                  <div className="ml-2 mt-1 space-y-1">
                    {leadChanges.addedLeads.slice(0, 3).map((lead, index) => (
                      <div key={index} className="text-[10px]">
                        {lead.name} ({lead.email}) - {lead.company}
                      </div>
                    ))}
                    {leadChanges.addedLeads.length > 3 && (
                      <div className="text-[10px] text-gray-500">
                        ... and {leadChanges.addedLeads.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {leadChanges.removedLeads.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Sample Removed Leads:</span>
                  <div className="ml-2 mt-1 space-y-1">
                    {leadChanges.removedLeads.slice(0, 3).map((lead, index) => (
                      <div key={index} className="text-[10px]">
                        {lead.name} ({lead.email}) - {lead.company}
                      </div>
                    ))}
                    {leadChanges.removedLeads.length > 3 && (
                      <div className="text-[10px] text-gray-500">
                        ... and {leadChanges.removedLeads.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change Log */}
        <div>
          <h2 className="text-xs font-light text-black mb-4 uppercase tracking-wide">
            CHANGE LOG
          </h2>
          {changeLog.length === 0 ? (
            <div className="text-xs text-gray-500">No changes recorded</div>
          ) : (
            <div className="space-y-2">
              {changeLog.map((entry, index) => (
                <div key={index} className="text-xs text-gray-600">
                  <span className="font-light">
                    {formatTimestamp(entry.change_timestamp)}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="font-light">
                    {formatChangeType(entry.change_type)}
                  </span>
                  {entry.campaign_name && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-light">{entry.campaign_name}</span>
                    </>
                  )}
                  {entry.details && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-light text-gray-500">{entry.details}</span>
                    </>
                  )}
                  {!entry.details && entry.lead_email && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-light">{entry.lead_email}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-sm w-full mx-4 border border-black" style={{ borderRadius: 0 }}>
            <div className="text-xs font-light text-black mb-4">
              Are you sure you want to create an activity for all these companies?
            </div>
            <div className="text-xs text-gray-600 mb-6">
              Companies: {showConfirmModal.companyCount}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 text-xs font-light border border-black bg-white text-black hover:bg-gray-50 transition-colors"
                style={{ borderRadius: 0 }}
              >
                CANCEL
              </button>
              <button
                onClick={confirmPush}
                className="px-4 py-2 text-xs font-light bg-black text-white hover:bg-gray-800 transition-colors"
                style={{ borderRadius: 0 }}
              >
                PUSH NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
