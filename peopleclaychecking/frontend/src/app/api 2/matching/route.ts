import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Path to backend directory
const BACKEND_DIR = path.join(process.cwd(), '../../backend');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filterId, forceRefresh = false } = body;

    // Build Python command
    let pythonCmd = '';
    
    if (filterId === null || filterId === undefined || filterId === '') {
      // Run matching for all organizations (no filter)
      pythonCmd = `
from matching import CompanyMatcher
import json
import sys

try:
    matcher = CompanyMatcher()
    
    # Check if results exist
    has_existing = matcher.has_existing_results(filter_id=None)
    from_cache = has_existing and not ${forceRefresh}
    
    if from_cache:
        result = matcher.get_existing_results(filter_id=None)
    else:
        result = matcher.perform_matching(filter_id=None)
    
    result['fromCache'] = from_cache
    result['success'] = True
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;
    } else {
      // Run matching for specific filter
      const filterIdEscaped = String(filterId).replace(/'/g, "\\'");
      pythonCmd = `
from filtered_matching import FilteredMatchingOrchestrator
import json
import sys

try:
    orchestrator = FilteredMatchingOrchestrator(
        'fc8bbfc8a9a884abbb51ecb16c0216f2',
        '64bb757c7d27fc5be60cc352858bba22bd5ba377'
    )
    result = orchestrator.run_matching_with_existing_filter('${filterIdEscaped}', force_refresh=${forceRefresh})
    
    # Check if from cache
    from_cache = result.get('status') == 'retrieved_from_cache'
    result['fromCache'] = from_cache
    result['success'] = True
    
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;
    }

    // Execute Python script
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && source venv/bin/activate && python3 -c ${JSON.stringify(pythonCmd)}`,
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
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error running matching:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run matching' },
      { status: 500 }
    );
  }
}

