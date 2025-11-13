import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    // Try Supabase first - lazy load to avoid build-time issues
    try {
      console.log('[push-activity] Fetching campaigns from Supabase...');
      console.log('[push-activity] Environment check:', {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
      });
      
      const { getCampaigns, getUniqueCompaniesByCampaign } = await import("@/lib/supabase-helpers");
      const campaigns = await getCampaigns();
      console.log(`[push-activity] Found ${campaigns.length} campaigns from Supabase`);
      
      if (campaigns.length === 0) {
        console.warn('[push-activity] WARNING: No campaigns found in Supabase. This could mean:');
        console.warn('[push-activity] 1. No campaigns have been synced to Supabase yet');
        console.warn('[push-activity] 2. All campaigns are marked as is_active = false');
        console.warn('[push-activity] 3. There is a connection/query issue');
      }
      
      // Enrich campaigns with unique_company_count
      console.log('[push-activity] Enriching campaigns with unique_company_count...');
      const enrichedCampaigns = await Promise.all(
        campaigns.map(async (campaign) => {
          try {
            const uniqueCompanies = await getUniqueCompaniesByCampaign(campaign.id);
            const count = uniqueCompanies.length;
            console.log(`[push-activity] Campaign ${campaign.name} (${campaign.id}): ${count} unique companies`);
            return {
              ...campaign,
              unique_company_count: count
            };
          } catch (error) {
            console.error(`[push-activity] Error getting unique companies for campaign ${campaign.id}:`, error);
            return {
              ...campaign,
              unique_company_count: 0
            };
          }
        })
      );
      
      // Filter out campaigns with 0 or 1 unique companies (same as Python script logic)
      const filteredCampaigns = enrichedCampaigns.filter(c => c.unique_company_count > 1);
      console.log(`[push-activity] After filtering: ${filteredCampaigns.length} campaigns with >1 unique companies`);
      
      return NextResponse.json({ 
        success: true, 
        campaigns: filteredCampaigns || [],
        lastUpdate: new Date().toISOString()
      });
    } catch (supabaseError) {
      console.error('[push-activity] Supabase fetch failed:', supabaseError);
      console.error('[push-activity] Error details:', {
        message: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
        stack: supabaseError instanceof Error ? supabaseError.stack : undefined
      });
      
      // On Vercel/production, Python scripts are not available
      // Return error details for debugging
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        console.error('[push-activity] Running on Vercel/production - Supabase failed:', {
          error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'
        });
        return NextResponse.json({ 
          success: false, 
          campaigns: [],
          lastUpdate: new Date().toISOString(),
          error: "Supabase connection failed",
          errorDetails: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
          environment: process.env.VERCEL ? 'vercel' : 'production'
        });
      }
      
      // Fallback to Python script (only in local development)
      const scriptPath = path.join(process.cwd(), "../backend/push_activity.py");
      const backendDir = path.join(process.cwd(), "../backend");
      
      return new Promise<NextResponse>((resolve) => {
        // Execute the Python script to get current campaigns
        const pythonProcess = spawn('bash', ['-c', `source venv/bin/activate && python3 "${scriptPath}" --get-campaigns`], {
          cwd: backendDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            console.log('Push activity data retrieved successfully');
            
            try {
              // Parse JSON output from the backend
              const result = JSON.parse(stdout);
              resolve(NextResponse.json({ 
                success: true, 
                campaigns: result.campaigns || [],
                lastUpdate: result.lastUpdate
              }));
            } catch (parseError) {
              console.error("Failed to parse Python script output:", parseError);
              // Return empty campaigns instead of error
              resolve(NextResponse.json({ 
                success: true, 
                campaigns: [],
                lastUpdate: new Date().toISOString(),
                error: "Failed to parse script output"
              }));
            }
          } else {
            console.error('Push activity retrieval failed with code:', code);
            console.error('Error output:', stderr);
            // Return empty campaigns instead of error
            resolve(NextResponse.json({ 
              success: true, 
              campaigns: [],
              lastUpdate: new Date().toISOString(),
              error: "Failed to retrieve push activity data"
            }));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('Failed to start Python process:', error);
          // Return empty campaigns instead of error
          resolve(NextResponse.json({ 
            success: true, 
            campaigns: [],
            lastUpdate: new Date().toISOString(),
            error: "Failed to execute push activity script"
          }));
        });
      });
    }
  } catch (error) {
    console.error("API error:", error);
    // Return success with empty campaigns to prevent UI from breaking
    return NextResponse.json({ 
      success: true, 
      campaigns: [],
      lastUpdate: new Date().toISOString(),
      error: "Internal server error"
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'update') {
      return NextResponse.json({ error: "Invalid action. Use 'update'" }, { status: 400 });
    }

    // Path to the push_activity.py script
    const scriptPath = path.join(process.cwd(), "../backend/push_activity.py");
    const backendDir = path.join(process.cwd(), "../backend");
    
    return new Promise<NextResponse>((resolve) => {
      // Execute the Python script to update campaigns
      const pythonProcess = spawn('bash', ['-c', `source venv/bin/activate && python3 "${scriptPath}" --update-campaigns`], {
        cwd: backendDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Push activity update completed successfully');
          
          // Parse the output to extract update statistics
          const lines = stdout.split('\n');
          let campaignsProcessed = 0;
          let campaignsAdded = 0;
          let campaignsRemoved = 0;
          let duration = 0;
          let leadsAdded = 0;
          let leadsRemoved = 0;
          const companyCountChanges: { [key: string]: number } = {};
          const addedLeads: any[] = [];
          const removedLeads: any[] = [];
          
          let inLeadChanges = false;
          let inCompanyChanges = false;
          let inAddedLeads = false;
          let inRemovedLeads = false;
          
          for (const line of lines) {
            if (line.includes('Campaigns processed:')) {
              const match = line.match(/Campaigns processed: (\d+)/);
              if (match) campaignsProcessed = parseInt(match[1]);
            }
            if (line.includes('Campaigns added:')) {
              const match = line.match(/Campaigns added: (\d+)/);
              if (match) campaignsAdded = parseInt(match[1]);
            }
            if (line.includes('Campaigns removed:')) {
              const match = line.match(/Campaigns removed: (\d+)/);
              if (match) campaignsRemoved = parseInt(match[1]);
            }
            if (line.includes('Duration:')) {
              const match = line.match(/Duration: ([\d.]+)s/);
              if (match) duration = parseFloat(match[1]);
            }
            if (line.includes('Lead changes:')) {
              const match = line.match(/Lead changes: \+(\d+) leads, -(\d+) leads/);
              if (match) {
                leadsAdded = parseInt(match[1]);
                leadsRemoved = parseInt(match[2]);
              }
            }
            if (line.includes('Company Count Changes:')) {
              inCompanyChanges = true;
              inLeadChanges = false;
              inAddedLeads = false;
              inRemovedLeads = false;
              continue;
            }
            if (line.includes('Sample Added Leads:')) {
              inAddedLeads = true;
              inCompanyChanges = false;
              inLeadChanges = false;
              inRemovedLeads = false;
              continue;
            }
            if (line.includes('Sample Removed Leads:')) {
              inRemovedLeads = true;
              inCompanyChanges = false;
              inLeadChanges = false;
              inAddedLeads = false;
              continue;
            }
            
            if (inCompanyChanges && line.includes('•')) {
              const match = line.match(/• (.+): ([+-]\d+) companies/);
              if (match) {
                companyCountChanges[match[1]] = parseInt(match[2]);
              }
            }
            if (inAddedLeads && line.includes('•')) {
              const match = line.match(/• (.+) \((.+)\) - (.+)/);
              if (match) {
                addedLeads.push({
                  name: match[1],
                  email: match[2],
                  company: match[3]
                });
              }
            }
            if (inRemovedLeads && line.includes('•')) {
              const match = line.match(/• (.+) \((.+)\) - (.+)/);
              if (match) {
                removedLeads.push({
                  name: match[1],
                  email: match[2],
                  company: match[3]
                });
              }
            }
          }
          
          resolve(NextResponse.json({ 
            success: true, 
            message: "Campaigns updated successfully",
            stats: {
              campaignsProcessed,
              campaignsAdded,
              campaignsRemoved,
              duration,
              leadsAdded,
              leadsRemoved,
              companyCountChanges,
              addedLeads,
              removedLeads
            },
            output: stdout
          }));
        } else {
          console.error('Push activity update failed with code:', code);
          console.error('Error output:', stderr);
          resolve(NextResponse.json({ 
            error: "Failed to update campaigns", 
            details: stderr,
            code: code
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        resolve(NextResponse.json({ 
          error: "Failed to execute push activity update", 
          details: error.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
