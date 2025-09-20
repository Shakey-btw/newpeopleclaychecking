import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

const backendDir = path.join(process.cwd(), "../backend");
const scriptPath = path.join(backendDir, "push_activity.py");

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

    return new Promise((resolve) => {
      const pythonProcess = spawn('bash', ['-c', `source venv/bin/activate && python3 ${scriptPath} --get-status --campaign-id ${campaignId}`], {
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
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
