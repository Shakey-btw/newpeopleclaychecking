import { NextRequest, NextResponse } from "next/server";
import path from "path";

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    // Get limit from query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Try Supabase first - lazy load to avoid build-time issues
    try {
      const { getChangeLog } = await import("@/lib/supabase-helpers");
      const changeLog = await getChangeLog(limit);
      return NextResponse.json({ 
        success: true,
        changeLog: changeLog || []
      });
    } catch (supabaseError) {
      console.log('Supabase fetch failed:', supabaseError);
      
      // On Vercel/production, SQLite is not available
      // Return empty change log instead of trying to use SQLite
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        console.log('Running on Vercel/production - skipping SQLite fallback');
        return NextResponse.json({ 
          success: true,
          changeLog: []
        });
      }
      
      // Fallback to SQLite (only in local development)
      try {
        const sqlite3Module = await import("sqlite3");
        const sqlite3 = sqlite3Module.default || sqlite3Module;
        const dbPath = path.join(process.cwd(), "../backend/push_activity.db");
        
        return new Promise<NextResponse>((resolve) => {
          const db = new sqlite3.Database(dbPath, (err: Error | null) => {
            if (err) {
              console.error("Error opening push activity database:", err);
              resolve(NextResponse.json({ 
                success: true,
                changeLog: []
              }));
              return;
            }
          });

          // Query to get change log entries
          db.all(`
            SELECT 
              change_type,
              campaign_name,
              lead_email,
              lead_company,
              old_value,
              new_value,
              change_timestamp,
              details
            FROM change_log 
            ORDER BY change_timestamp DESC 
            LIMIT ?
          `, [limit], (err: Error | null, rows: any[]) => {
            if (err) {
              console.error("Error querying change log:", err);
              db.close();
              resolve(NextResponse.json({ 
                success: true,
                changeLog: []
              }));
            } else {
              db.close();
              resolve(NextResponse.json({ 
                success: true,
                changeLog: rows || []
              }));
            }
          });
        });
      } catch (dbError) {
        console.error("SQLite fallback failed:", dbError);
        return NextResponse.json({ 
          success: true,
          changeLog: []
        });
      }
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
