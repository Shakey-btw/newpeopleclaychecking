import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Path to backend directory
const BACKEND_DIR = path.join(process.cwd(), '../../backend');

export async function GET() {
  try {
    // Execute Python script to get user filters
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && source venv/bin/activate && python3 -c "from main import DataSyncOrchestrator; import json; orchestrator = DataSyncOrchestrator('fc8bbfc8a9a884abbb51ecb16c0216f2', '64bb757c7d27fc5be60cc352858bba22bd5ba377'); filters = orchestrator.get_user_filters(); print(json.dumps(filters))"`,
      { shell: '/bin/bash', maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Python stderr:', stderr);
    }

    const filters = JSON.parse(stdout.trim());
    
    return NextResponse.json({ 
      success: true, 
      filters: filters || [] 
    });
  } catch (error: any) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filterUrl } = body;

    if (!filterUrl) {
      return NextResponse.json(
        { success: false, error: 'filterUrl is required' },
        { status: 400 }
      );
    }

    // Execute Python script to process filter
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && source venv/bin/activate && python3 -c "
from main import DataSyncOrchestrator
from filtered_matching import FilteredMatchingOrchestrator
import json
import sys

try:
    orchestrator = FilteredMatchingOrchestrator(
        'fc8bbfc8a9a884abbb51ecb16c0216f2',
        '64bb757c7d27fc5be60cc352858bba22bd5ba377'
    )
    result = orchestrator.process_filter_url('${filterUrl.replace(/'/g, "\\'")}', status_filter='running', force_refresh=False)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}), file=sys.stderr)
    sys.exit(1)
"`,
      { shell: '/bin/bash', maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
      console.error('Python stderr:', stderr);
      // Try to parse error from stderr
      try {
        const errorData = JSON.parse(stderr.trim());
        if (errorData.error) {
          return NextResponse.json(
            { success: false, error: errorData.error },
            { status: 500 }
          );
        }
      } catch {
        // Not JSON, continue with stdout
      }
    }

    const result = JSON.parse(stdout.trim());
    
    // Check if filter already exists
    const isExistingFilter = result.status === 'retrieved_from_cache';
    
    return NextResponse.json({
      success: true,
      filterId: result.filter_id,
      isExistingFilter: isExistingFilter,
      ...result
    });
  } catch (error: any) {
    console.error('Error processing filter:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process filter' },
      { status: 500 }
    );
  }
}

