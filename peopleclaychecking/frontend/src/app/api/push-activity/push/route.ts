import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

const backendDir = path.join(process.cwd(), "../backend");
const scriptPath = path.join(backendDir, "push_activity.py");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, action } = body; // action: 'push_all' or 'push_new'

    if (!campaignId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing campaignId or action" 
      }, { status: 400 });
    }

    return new Promise<NextResponse>((resolve) => {
      const pythonProcess = spawn('bash', ['-c', `source venv/bin/activate && python3 "${scriptPath}" --${action.replace('_', '-')} --campaign-id ${campaignId}`], {
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

      pythonProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // If push was successful, also mark companies as pushed in Supabase
            if (result.success && result.companies && result.companies.length > 0) {
              try {
                const { markCompaniesAsPushed } = await import("@/lib/supabase-helpers");
                await markCompaniesAsPushed(campaignId, result.companies);
                console.log(`[push-activity-push] Marked ${result.companies.length} companies as pushed in Supabase`);
              } catch (supabaseError) {
                console.error('[push-activity-push] Failed to mark companies as pushed in Supabase:', supabaseError);
                // Don't fail the request if Supabase update fails - Python script already succeeded
              }
            }
            
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
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
