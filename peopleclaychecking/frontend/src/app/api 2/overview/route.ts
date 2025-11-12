import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Path to backend directory
const BACKEND_DIR = path.join(process.cwd(), '../../backend');

export async function GET() {
  try {
    // Execute Python script to get overview data
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && source venv/bin/activate && python3 push_activity.py --get-overview`,
      { shell: '/bin/bash', maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
      console.error('Python stderr:', stderr);
    }

    const data = JSON.parse(stdout.trim());
    
    return NextResponse.json({ 
      success: true, 
      ...data 
    });
  } catch (error: any) {
    console.error('Error fetching overview:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'sync') {
      // Sync campaigns
      const { stdout, stderr } = await execAsync(
        `cd "${BACKEND_DIR}" && source venv/bin/activate && python3 push_activity.py --update-campaigns`,
        { shell: '/bin/bash', maxBuffer: 10 * 1024 * 1024 }
      );

      if (stderr && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
        console.error('Python stderr:', stderr);
      }

      // Parse output to get stats (push_activity.py outputs to stdout)
      // The script prints stats, we'll need to parse them or modify the script
      // For now, return success
      return NextResponse.json({
        success: true,
        stats: { message: 'Sync completed' }
      });
    } else if (action === 'get-companies') {
      // Get all companies
      const { stdout, stderr } = await execAsync(
        `cd "${BACKEND_DIR}" && source venv/bin/activate && python3 push_activity.py --get-companies`,
        { shell: '/bin/bash', maxBuffer: 10 * 1024 * 1024 }
      );

      if (stderr && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
        console.error('Python stderr:', stderr);
      }

      const data = JSON.parse(stdout.trim());
      
      return NextResponse.json({
        success: true,
        companies: data.companies || []
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error processing overview action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process action' },
      { status: 500 }
    );
  }
}

