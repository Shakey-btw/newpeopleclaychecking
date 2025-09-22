import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

export async function GET() {
  try {
    // Path to the push_activity.py script
    const scriptPath = path.join(process.cwd(), "../backend/push_activity.py");
    const backendDir = path.join(process.cwd(), "../backend");
    
    return new Promise((resolve) => {
      // Execute the Python script to get overview data
      const pythonProcess = spawn('bash', ['-c', `source venv/bin/activate && python3 "${scriptPath}" --get-overview`], {
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
          console.log('Overview data retrieved successfully');
          
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
            resolve(NextResponse.json({ 
              success: false, 
              error: "Failed to parse script output", 
              details: stdout 
            }, { status: 500 }));
          }
        } else {
          console.error('Overview data retrieval failed with code:', code);
          console.error('Error output:', stderr);
          resolve(NextResponse.json({ 
            error: "Failed to retrieve overview data", 
            details: stderr,
            code: code
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        resolve(NextResponse.json({ 
          error: "Failed to execute overview script", 
          details: error.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'sync') {
      return NextResponse.json({ error: "Invalid action. Use 'sync'" }, { status: 400 });
    }

    // Path to the push_activity.py script
    const scriptPath = path.join(process.cwd(), "../backend/push_activity.py");
    const backendDir = path.join(process.cwd(), "../backend");
    
    return new Promise((resolve) => {
      // Execute the Python script to sync data
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
          console.log('Overview sync completed successfully');
          
          // Parse the output to extract sync statistics
          const lines = stdout.split('\n');
          let campaignsProcessed = 0;
          let campaignsAdded = 0;
          let campaignsRemoved = 0;
          let duration = 0;
          let leadsAdded = 0;
          let leadsRemoved = 0;
          
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
          }
          
          resolve(NextResponse.json({ 
            success: true, 
            message: "Data synced successfully",
            stats: {
              campaignsProcessed,
              campaignsAdded,
              campaignsRemoved,
              duration,
              leadsAdded,
              leadsRemoved
            },
            output: stdout
          }));
        } else {
          console.error('Overview sync failed with code:', code);
          console.error('Error output:', stderr);
          resolve(NextResponse.json({ 
            error: "Failed to sync data", 
            details: stderr,
            code: code
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        resolve(NextResponse.json({ 
          error: "Failed to execute sync", 
          details: error.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
