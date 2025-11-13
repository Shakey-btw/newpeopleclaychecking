import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing campaignId" 
      }, { status: 400 });
    }

    // Use Supabase directly (works in production)
    try {
      const { getCampaignPushStatus } = await import("@/lib/supabase-helpers");
      const status = await getCampaignPushStatus(campaignId);
      
      return NextResponse.json({ 
        success: true, 
        result: status 
      });
    } catch (supabaseError) {
      console.error('[push-activity-status] Supabase fetch failed:', supabaseError);
      
      // On Vercel/production, Python scripts are not available
      // Return error details for debugging
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return NextResponse.json({ 
          success: false, 
          error: "Supabase connection failed",
          errorDetails: supabaseError instanceof Error ? supabaseError.message : String(supabaseError)
        }, { status: 500 });
      }
      
      // Fallback to Python script (only in local development)
      const path = await import("path");
      const { spawn } = await import("child_process");
      const backendDir = path.join(process.cwd(), "../backend");
      const scriptPath = path.join(backendDir, "push_activity.py");
      
      return new Promise<NextResponse>((resolve) => {
        const pythonProcess = spawn('bash', ['-c', `source venv/bin/activate && python3 "${scriptPath}" --get-status --campaign-id ${campaignId}`], {
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
            try {
              const result = JSON.parse(stdout);
              resolve(NextResponse.json({ success: true, result }));
            } catch (parseError) {
              console.error("Failed to parse Python script output:", parseError);
              resolve(NextResponse.json({ 
                success: false, 
                error: "Failed to parse script output", 
                details: stdout 
              }, { status: 500 }));
            }
          } else {
            console.error('Python script failed with code:', code);
            console.error('Error output:', stderr);
            resolve(NextResponse.json({ 
              success: false, 
              error: "Backend script failed", 
              details: stderr 
            }, { status: 500 }));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('Failed to start Python process:', error);
          resolve(NextResponse.json({ 
            success: false, 
            error: "Failed to execute script", 
            details: error.message 
          }, { status: 500 }));
        });
      });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      errorDetails: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
