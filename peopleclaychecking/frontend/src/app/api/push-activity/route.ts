import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

export async function GET() {
  try {
    // Path to the push_activity.py script
    const scriptPath = path.join(process.cwd(), "../backend/push_activity.py");
    const backendDir = path.join(process.cwd(), "../backend");
    
    return new Promise((resolve) => {
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
            resolve(NextResponse.json({ 
              success: false, 
              error: "Failed to parse script output", 
              details: stdout 
            }, { status: 500 }));
          }
        } else {
          console.error('Push activity retrieval failed with code:', code);
          console.error('Error output:', stderr);
          resolve(NextResponse.json({ 
            error: "Failed to retrieve push activity data", 
            details: stderr,
            code: code
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        resolve(NextResponse.json({ 
          error: "Failed to execute push activity script", 
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

    if (action !== 'update') {
      return NextResponse.json({ error: "Invalid action. Use 'update'" }, { status: 400 });
    }

    // Path to the push_activity.py script
    const scriptPath = path.join(process.cwd(), "../backend/push_activity.py");
    const backendDir = path.join(process.cwd(), "../backend");
    
    return new Promise((resolve) => {
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
