"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface TableInfo {
  name: string;
  exists: boolean;
  rowCount?: number;
  error?: string;
}

export default function TestTables() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStatus, setOverallStatus] = useState<"checking" | "success" | "error">("checking");

  const requiredTables = [
    "organizations",
    "campaigns",
    "leads",
    "user_filters",
    "filtered_organizations",
    "matching_summary",
    "detailed_matches",
    "change_log",
    "filter_conditions",
    "organization_custom_fields",
  ];

  useEffect(() => {
    async function checkTables() {
      const results: TableInfo[] = [];

      for (const tableName of requiredTables) {
        try {
          // Try to query the table (even if empty, this confirms it exists)
          const { data, error, count } = await supabase
            .from(tableName)
            .select("*", { count: "exact", head: true });

          if (error) {
            // Check if it's a "table doesn't exist" error
            if (error.code === "PGRST116" || error.message.includes("does not exist")) {
              results.push({
                name: tableName,
                exists: false,
                error: "Table not found",
              });
            } else {
              results.push({
                name: tableName,
                exists: true,
                error: error.message,
                rowCount: 0,
              });
            }
          } else {
            results.push({
              name: tableName,
              exists: true,
              rowCount: count || 0,
            });
          }
        } catch (err: any) {
          results.push({
            name: tableName,
            exists: false,
            error: err.message || "Unknown error",
          });
        }
      }

      setTables(results);
      setLoading(false);

      // Check overall status
      const allExist = results.every((t) => t.exists);
      setOverallStatus(allExist ? "success" : "error");
    }

    checkTables();
  }, []);

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-light mb-6">Supabase Tables Verification</h1>

        {loading ? (
          <div className="border border-gray-200 p-6 rounded">
            <p className="text-gray-600">Checking tables...</p>
          </div>
        ) : (
          <>
            {/* Overall Status */}
            <div
              className={`border p-6 rounded mb-6 ${
                overallStatus === "success"
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
              }`}
            >
              <h2 className="text-lg font-medium mb-2">
                {overallStatus === "success" ? "✅ All Tables Found!" : "❌ Some Tables Missing"}
              </h2>
              <p className="text-sm text-gray-600">
                {overallStatus === "success"
                  ? "All required tables exist and are accessible. You're ready to use Supabase!"
                  : "Some tables are missing. Please check the list below and create any missing tables."}
              </p>
            </div>

            {/* Table List */}
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Table Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Row Count
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tables.map((table) => (
                    <tr key={table.name}>
                      <td className="px-4 py-3 text-sm font-mono">{table.name}</td>
                      <td className="px-4 py-3">
                        {table.exists ? (
                          <span className="text-green-600 font-medium">✅ Exists</span>
                        ) : (
                          <span className="text-red-600 font-medium">❌ Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {table.exists && table.rowCount !== undefined
                          ? table.rowCount.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {table.error || (table.exists && table.rowCount === 0
                          ? "Empty (ready to use)"
                          : "Ready")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Next Steps */}
            <div className="mt-6 border border-gray-200 p-6 rounded">
              <h2 className="text-lg font-medium mb-3">Next Steps</h2>
              {overallStatus === "success" ? (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>✅ All tables are set up correctly!</p>
                  <p>You can now:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Visit <a href="/overview" className="text-blue-600 underline">/overview</a> to see it using Supabase</li>
                    <li>Start inserting data into your tables</li>
                    <li>Use the helper functions in <code className="bg-gray-100 px-1">supabase-helpers.ts</code></li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>❌ Some tables are missing. Please:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Go to Supabase SQL Editor</li>
                    <li>Run the SQL script from <code className="bg-gray-100 px-1">SUPABASE_TABLES.sql</code></li>
                    <li>Refresh this page to verify</li>
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

