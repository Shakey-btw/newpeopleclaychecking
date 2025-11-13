import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV,
    },
    supabase: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` 
        : 'NOT SET',
    },
    tests: {} as any,
  };

  // Test 1: Supabase Client Initialization
  try {
    const { supabase } = await import("@/lib/supabase");
    diagnostics.tests.supabaseClientInit = {
      success: true,
      message: "Supabase client initialized successfully",
    };
  } catch (error: any) {
    diagnostics.tests.supabaseClientInit = {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }

  // Test 2: Get Campaigns
  try {
    const { getCampaigns } = await import("@/lib/supabase-helpers");
    const campaigns = await getCampaigns();
    diagnostics.tests.getCampaigns = {
      success: true,
      count: campaigns.length,
      campaigns: campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        is_active: c.is_active,
      })),
    };
  } catch (error: any) {
    diagnostics.tests.getCampaigns = {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }

  // Test 3: Get Leads for First Campaign
  try {
    const { getCampaigns, getUniqueCompaniesByCampaign } = await import("@/lib/supabase-helpers");
    const campaigns = await getCampaigns();
    if (campaigns.length > 0) {
      const firstCampaign = campaigns[0];
      const uniqueCompanies = await getUniqueCompaniesByCampaign(firstCampaign.id);
      diagnostics.tests.getUniqueCompanies = {
        success: true,
        campaignId: firstCampaign.id,
        campaignName: firstCampaign.name,
        uniqueCompaniesCount: uniqueCompanies.length,
        sampleCompanies: uniqueCompanies.slice(0, 5),
      };
    } else {
      diagnostics.tests.getUniqueCompanies = {
        success: true,
        message: "No campaigns found to test",
      };
    }
  } catch (error: any) {
    diagnostics.tests.getUniqueCompanies = {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }

  // Test 4: Direct Supabase Query
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .limit(5);
    
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('id, campaign_id, company_name, state, state_system')
      .eq('is_active', true)
      .limit(10);

    diagnostics.tests.directQuery = {
      success: !campaignsError && !leadsError,
      campaigns: {
        count: campaignsData?.length || 0,
        error: campaignsError?.message,
        sample: campaignsData?.slice(0, 3),
      },
      leads: {
        count: leadsData?.length || 0,
        error: leadsError?.message,
        sample: leadsData?.slice(0, 3),
      },
    };
  } catch (error: any) {
    diagnostics.tests.directQuery = {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }

  // Test 5: Check Change Log
  try {
    const { getChangeLog } = await import("@/lib/supabase-helpers");
    const changeLog = await getChangeLog(5);
    diagnostics.tests.getChangeLog = {
      success: true,
      count: changeLog.length,
      sample: changeLog.slice(0, 3),
    };
  } catch (error: any) {
    diagnostics.tests.getChangeLog = {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

