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
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [viewMode, setViewMode] = useState<'open-to-push' | 'all-campaigns'>('open-to-push');
  const [newlyDiscoveredCampaigns, setNewlyDiscoveredCampaigns] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Navigation items for this page
  const navItems = [
    { id: "network-commit", label: "NETWORK UPLOAD", href: "/network-commit" },
    { id: "company-checking", label: "PEOPLE CHECKING", href: "/company-checking" },
    { id: "overview", label: "ANALYTICS", href: "/overview" },
    { id: "push-activity", label: "PUSH ACTIVITY", href: "/push-activity" },
  ];

  const fetchData = async () => {
    try {
      setIsUpdating(true); // Use sync loading animation instead of separate loading
      
      let newCampaigns: Campaign[] = [];
      
      // Try Supabase directly from client-side first (more reliable in production)
      try {
        const { getCampaigns, getUniqueCompaniesByCampaign, getChangeLog } = await import("@/lib/supabase-helpers");
        
        // Fetch campaigns and change log in parallel
        const [campaignsList, changeLogData] = await Promise.all([
          getCampaigns(),
          getChangeLog(20)
        ]);
        
        console.log(`[push-activity-page] Found ${campaignsList.length} campaigns from Supabase`);
        
        // Enrich campaigns with unique_company_count
        const enrichedCampaigns = await Promise.all(
          campaignsList.map(async (campaign) => {
            try {
              const uniqueCompanies = await getUniqueCompaniesByCampaign(campaign.id);
              const count = uniqueCompanies.length;
              return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                unique_company_count: count
              };
            } catch (error) {
              console.error(`[push-activity-page] Error getting unique companies for campaign ${campaign.id}:`, error);
              return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                unique_company_count: 0
              };
            }
          })
        );
        
        // Filter out campaigns with 0 or 1 unique companies (same as API logic)
        newCampaigns = enrichedCampaigns.filter(c => c.unique_company_count > 1);
        console.log(`[push-activity-page] After filtering: ${newCampaigns.length} campaigns with >1 unique companies`);
        
        // Set change log
        setChangeLog(changeLogData || []);
        
      } catch (supabaseError) {
        console.log('[push-activity-page] Supabase fetch failed, using API fallback:', supabaseError);
        
        // Fall back to API route
        const [campaignsResponse, changelogResponse] = await Promise.all([
          fetch('/api/push-activity'),
          fetch('/api/push-activity/changelog?limit=20')
        ]);
        
        const campaignsData = await campaignsResponse.json();
        const changelogData = await changelogResponse.json();
        
        console.log('[push-activity-page] API Response:', {
          campaignsSuccess: campaignsData.success,
          campaignsCount: campaignsData.campaigns?.length || 0,
          error: campaignsData.error
        });
        
        if (campaignsData.success) {
          newCampaigns = campaignsData.campaigns || [];
        }
        
        if (changelogData.success) {
          setChangeLog(changelogData.changeLog || []);
        }
      }
      
      if (newCampaigns.length === 0) {
        console.warn('[push-activity-page] No campaigns returned. Possible reasons:');
        console.warn('[push-activity-page] 1. No campaigns in Supabase with is_active = true');
        console.warn('[push-activity-page] 2. All campaigns have ≤1 unique companies (filtered out)');
        console.warn('[push-activity-page] 3. All leads are paused (filtered out)');
        console.warn('[push-activity-page] Check /api/debug/diagnose for detailed diagnostics');
      }
      
      const currentCampaignIds = new Set(campaigns.map(c => c.id));
      const newlyDiscovered = new Set<string>();
      
      // Only find newly discovered campaigns if we had previous campaigns to compare against
      if (campaigns.length > 0) {
        newCampaigns.forEach((campaign: Campaign) => {
          if (!currentCampaignIds.has(campaign.id)) {
            newlyDiscovered.add(campaign.id);
          }
        });
      }
      
      console.log('[push-activity-page] Setting campaigns state:', newCampaigns.length, 'campaigns');
      setCampaigns(newCampaigns);
      setNewlyDiscoveredCampaigns(newlyDiscovered);
      setLastUpdate(new Date().toISOString());
      
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error to show "no campaigns" message
      setCampaigns([]);
      setChangeLog([]);
    } finally {
      setIsUpdating(false); // Use sync loading animation instead of separate loading
      setIsInitialLoad(false); // Mark that initial load is complete
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
        
        // Update campaigns and change log without clearing the view
        await updateCampaignsData();
        await fetchChangeLog();
        console.log('Update completed:', data.stats);
        
        // Clear newly discovered campaigns after sync
        setNewlyDiscoveredCampaigns(new Set());
        
        // Show checkmark for 2 seconds (only if not initial load)
        if (!isInitialLoad) {
          setShowCheckmark(true);
          setTimeout(() => {
            setShowCheckmark(false);
          }, 2000);
        }
      } else {
        console.error('Failed to update campaigns:', data.error);
      }
    } catch (error) {
      console.error('Error updating campaigns:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateCampaignsData = async () => {
    try {
      // Fetch only campaigns data without setting loading state
      const campaignsResponse = await fetch('/api/push-activity');
      const campaignsData = await campaignsResponse.json();
      
      if (campaignsData.success) {
        const newCampaigns = campaignsData.campaigns || [];
        const currentCampaignIds = new Set(campaigns.map(c => c.id));
        const newlyDiscovered = new Set<string>();
        
        // Only find newly discovered campaigns if we had previous campaigns to compare against
        if (campaigns.length > 0) {
          newCampaigns.forEach((campaign: Campaign) => {
            if (!currentCampaignIds.has(campaign.id)) {
              newlyDiscovered.add(campaign.id);
            }
          });
        }
        
        setCampaigns(newCampaigns);
        setNewlyDiscoveredCampaigns(newlyDiscovered);
        setLastUpdate(new Date().toISOString());
      }
      
      // Update push status for all campaigns
      if (campaignsData.success && campaignsData.campaigns) {
        campaignsData.campaigns.forEach((campaign: Campaign) => {
          fetchPushStatus(campaign.id);
        });
      }
    } catch (error) {
      console.error('Error updating campaigns data:', error);
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
      
      console.log(`[push-activity-page] Status API response for ${campaignId}:`, {
        success: data.success,
        result: data.result,
        error: data.error,
        errorDetails: data.errorDetails
      });
      
      if (data.success) {
        setPushStatus(prev => ({
          ...prev,
          [campaignId]: data.result
        }));
      } else {
        console.error(`[push-activity-page] Status API failed for ${campaignId}:`, data.error, data.errorDetails);
        // Set a default status indicating it failed to load
        // This prevents campaigns from showing as "open to push" when status fails
        setPushStatus(prev => ({
          ...prev,
          [campaignId]: {
            has_ever_been_pushed: false,
            has_new_companies: false,
            total_companies: 0,
            new_companies: 0,
            show_push_new: false,
            _error: true,
            _errorMessage: data.error || 'Failed to fetch status'
          }
        }));
      }
    } catch (error) {
      console.error(`[push-activity-page] Error fetching push status for ${campaignId}:`, error);
      // Set error status to prevent showing as "open to push"
      setPushStatus(prev => ({
        ...prev,
        [campaignId]: {
          has_ever_been_pushed: false,
          has_new_companies: false,
          total_companies: 0,
          new_companies: 0,
          show_push_new: false,
          _error: true,
          _errorMessage: error instanceof Error ? error.message : String(error)
        }
      }));
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

  const getFilteredCampaigns = () => {
    console.log('[push-activity-page] getFilteredCampaigns called:', {
      viewMode,
      campaignsCount: campaigns.length,
      pushStatusKeys: Object.keys(pushStatus),
      campaigns: campaigns.map(c => ({ id: c.id, name: c.name }))
    });
    
    if (viewMode === 'all-campaigns') {
      console.log('[push-activity-page] Returning all campaigns:', campaigns.length);
      return campaigns;
    }
    
    // Filter for "open-to-push" view
    const filtered = campaigns.filter(campaign => {
      const status = pushStatus[campaign.id];
      
      // If status hasn't loaded yet, show the campaign (treat as never been pushed)
      if (!status) {
        console.log(`[push-activity-page] Campaign ${campaign.name} has no status, showing it`);
        return true;
      }
      
      // Show campaigns that have never been pushed OR have new companies
      const shouldShow = !status.has_ever_been_pushed || status.has_new_companies;
      console.log(`[push-activity-page] Campaign ${campaign.name}: has_ever_been_pushed=${status.has_ever_been_pushed}, has_new_companies=${status.has_new_companies}, shouldShow=${shouldShow}`);
      return shouldShow;
    });
    
    console.log('[push-activity-page] Filtered campaigns count:', filtered.length);
    return filtered;
  };

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6">
      {/* Top Left Navigation */}
      <div className="absolute top-[40px] left-6">
        <TopLeftNav items={navItems} />
      </div>
      
       <div className="mx-auto" style={{ paddingTop: '16px', maxWidth: 'calc(896px - 200px)' }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setViewMode('open-to-push');
                  setShowChangeLog(false);
                }}
                className={`text-xs font-light cursor-pointer ${
                  viewMode === 'open-to-push' && !showChangeLog
                    ? 'text-black'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.03em'
                }}
              >
                OPEN TO PUSH
              </button>
              <span className="text-xs text-gray-300">/</span>
              <button
                onClick={() => {
                  setViewMode('all-campaigns');
                  setShowChangeLog(false);
                }}
                className={`text-xs font-light cursor-pointer ${
                  viewMode === 'all-campaigns' && !showChangeLog
                    ? 'text-black'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.03em'
                }}
              >
                ALL CAMPAIGNS
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowChangeLog(!showChangeLog)}
                className={`text-xs font-light flex items-center cursor-pointer ${
                  showChangeLog
                    ? 'text-black'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.03em'
                }}
              >
                HISTORY
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className={`text-xs font-light ${
                  isUpdating
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-400 cursor-pointer hover:text-gray-600'
                }`}
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.03em'
                }}
              >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-gray-400 border-t-black rounded-full animate-spin"></div>
                  <span className="text-xs font-light text-gray-600 uppercase">syncing data</span>
                </div>
              ) : showCheckmark ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 text-black">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  </div>
                  <span className="text-xs font-light text-gray-600 uppercase">successful</span>
                </div>
              ) : (
                'SYNC'
              )}
              </button>
            </div>
          </div>
        </div>

        {/* Campaigns List or Change Log */}
        <div className="mb-12 overflow-hidden" style={{ marginTop: '14px' }}>
          <div className={`transition-all duration-300 ease-out ${
            showChangeLog 
              ? 'opacity-100 max-h-screen' 
              : 'opacity-0 max-h-0 pointer-events-none'
          }`}>
            {/* Change Log */}
            <div>
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
          
          <div className={`transition-all duration-300 ease-out ${
            !showChangeLog 
              ? 'opacity-100 max-h-screen' 
              : 'opacity-0 max-h-0 pointer-events-none'
          }`}>
            {/* Campaigns List */}
            {getFilteredCampaigns().length === 0 ? (
              <div className="border-t border-gray-200 py-2">
                <div className="text-xs text-gray-500">
                  {viewMode === 'open-to-push' ? 'no open campaigns' : 'No campaigns found'}
                </div>
              </div>
            ) : (
            <div className="space-y-1 transition-all duration-300 ease-out">
              {getFilteredCampaigns().map((campaign, index) => {
                const companyChange = leadChanges?.companyCountChanges?.[campaign.name] || 0;
                const status = pushStatus[campaign.id];
                const isPushing = pushing[campaign.id] || false;
                const hasEverBeenPushed = status?.has_ever_been_pushed || false;
                const showPushNew = status?.show_push_new || false;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between text-xs font-light text-black ${
                      index === 0 
                        ? 'border-t border-b border-gray-100' 
                        : 'border-b border-gray-100 last:border-b-0'
                    }`}
                    style={{
                      paddingTop: '8px',
                      paddingBottom: '8px',
                      lineHeight: '16px'
                    }}
                  >
                      <span>
                        {newlyDiscoveredCampaigns.has(campaign.id) && <span className="text-green-600">(new) </span>}
                        {campaign.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {viewMode === 'open-to-push' && showPushNew ? (
                          // Show new companies count for PUSH NEW campaigns
                          <span className="text-gray-500">
                            {pushStatus[campaign.id]?.new_companies || 0} <span className="text-green-600">(new)</span>
                          </span>
                        ) : (
                          // Show total companies count for PUSH ALL campaigns
                          <>
                            <span className="text-gray-500">{campaign.unique_company_count}</span>
                            {companyChange !== 0 && (
                              <span className={`text-xs ${companyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {companyChange > 0 ? '+' : ''}{companyChange}
                              </span>
                            )}
                          </>
                        )}
                      
                      {/* Push Buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        {viewMode === 'all-campaigns' ? (
                          // All campaigns view - only PUSH ALL button
                          <button
                            onClick={() => handlePushAll(campaign.id)}
                            disabled={isPushing}
                            className="w-4 h-4 border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                            style={{
                              width: '16px',
                              height: '16px',
                              borderColor: '#EEEFF1',
                              backgroundColor: '#FBFBFB',
                              borderRadius: '3px'
                            }}
                          >
                            {isPushing ? (
                              <div className="w-2 h-2 border border-gray-400 border-t-black rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-symbols-outlined text-black" style={{ fontSize: '12px' }}>
                                arrow_forward
                              </span>
                            )}
                          </button>
                        ) : (
                          // Open to push view - PUSH NEW if available, otherwise PUSH ALL
                          <>
                            {showPushNew ? (
                              <button
                                onClick={() => handlePushNew(campaign.id)}
                                disabled={isPushing}
                                className="w-4 h-4 border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderColor: '#EEEFF1',
                                  backgroundColor: '#FBFBFB',
                                  borderRadius: '3px',
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                              >
                                {isPushing ? (
                                  <div className="w-2 h-2 border border-gray-400 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#000000' }}>
                                    arrow_forward
                                  </span>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePushAll(campaign.id)}
                                disabled={isPushing}
                                className="w-4 h-4 border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderColor: '#EEEFF1',
                                  backgroundColor: '#FBFBFB',
                                  borderRadius: '3px',
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                              >
                                {isPushing ? (
                                  <div className="w-2 h-2 border border-gray-400 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#000000' }}>
                                    arrow_forward
                                  </span>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
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
                className="px-4 py-2 text-xs font-light border border-black bg-white text-black"
                style={{ borderRadius: 0 }}
              >
                CANCEL
              </button>
              <button
                onClick={confirmPush}
                className="px-4 py-2 text-xs font-light bg-black text-white"
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
