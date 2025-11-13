import { NextRequest, NextResponse } from "next/server";
import { getChangeLog } from "@/lib/supabase-helpers";
import sqlite3 from "sqlite3";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Get limit from query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Try Supabase first
    try {
      const changeLog = await getChangeLog(limit);
      return NextResponse.json({ 
        success: true,
        changeLog: changeLog || []
      });
    } catch (supabaseError) {
      console.log('Supabase fetch failed, falling back to SQLite:', supabaseError);
      
      // Fallback to SQLite
      const dbPath = path.join(process.cwd(), "../backend/push_activity.db");
      
      return new Promise<NextResponse>((resolve) => {
        const db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            console.error("Error opening push activity database:", err);
            resolve(NextResponse.json({ error: "Database connection failed" }, { status: 500 }));
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
        `, [limit], (err, rows: any[]) => {
          if (err) {
            console.error("Error querying change log:", err);
            resolve(NextResponse.json({ error: "Query failed" }, { status: 500 }));
          } else {
            resolve(NextResponse.json({ 
              success: true,
              changeLog: rows || []
            }));
          }
          
          db.close();
        });
      });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
