import { NextRequest, NextResponse } from "next/server";
import { getMatchingSummary } from "@/lib/supabase-helpers";
import sqlite3 from "sqlite3";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Get filterId from query parameters
    const { searchParams } = new URL(request.url);
    const filterId = searchParams.get('filterId');
    
    // Try Supabase first
    try {
      const summary = await getMatchingSummary(filterId);
      
      if (!summary) {
        return NextResponse.json({ 
          running: 0, 
          notActive: 0,
          filterId: filterId,
          filterName: null,
          hasData: false
        });
      }
      
      return NextResponse.json({ 
        running: summary.matching_companies || 0, 
        notActive: summary.non_matching_pipedrive || 0,
        filterId: filterId,
        filterName: summary.filter_name,
        hasData: true,
        lastUpdated: summary.created_at
      });
    } catch (supabaseError) {
      console.log('Supabase fetch failed, falling back to SQLite:', supabaseError);
      
      // Fallback to SQLite
      const dbPath = path.join(process.cwd(), "../backend/results.db");
      
      return new Promise<NextResponse>((resolve) => {
        const db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            console.error("Error opening database:", err);
            resolve(NextResponse.json({ error: "Database connection failed" }, { status: 500 }));
            return;
          }
        });

        // Build query based on filterId
        let query: string;
        let params: any[];
        
        if (filterId === null || filterId === 'null' || filterId === '') {
          query = `
            SELECT matching_companies, non_matching_pipedrive, filter_name, created_at
            FROM matching_summary 
            WHERE filter_id IS NULL OR filter_id = ''
            ORDER BY created_at DESC 
            LIMIT 1
          `;
          params = [];
        } else {
          query = `
            SELECT matching_companies, non_matching_pipedrive, filter_name, created_at
            FROM matching_summary 
            WHERE filter_id = ?
            ORDER BY created_at DESC 
            LIMIT 1
          `;
          params = [filterId];
        }

        db.get(query, params, (err, row: any) => {
          if (err) {
            console.error("Error querying database:", err);
            resolve(NextResponse.json({ error: "Query failed" }, { status: 500 }));
          } else if (!row) {
            resolve(NextResponse.json({ 
              running: 0, 
              notActive: 0,
              filterId: filterId,
              filterName: null,
              hasData: false
            }));
          } else {
            resolve(NextResponse.json({ 
              running: row.matching_companies || 0, 
              notActive: row.non_matching_pipedrive || 0,
              filterId: filterId,
              filterName: row.filter_name,
              hasData: true,
              lastUpdated: row.created_at
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