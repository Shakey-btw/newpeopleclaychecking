"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test basic connection
        const { data, error } = await supabase
          .from("_prisma_migrations")
          .select("id")
          .limit(1);

        if (error) {
          // This is expected if the table doesn't exist, but connection works
          if (error.code === "PGRST116" || error.message.includes("does not exist")) {
            setStatus("success");
            setMessage("✅ Supabase connection successful! (No tables found yet, but connection works)");
          } else {
            throw error;
          }
        } else {
          setStatus("success");
          setMessage("✅ Supabase connection successful!");
        }

        // Try to get list of tables (this might not work depending on RLS)
        // But we can at least verify the connection
      } catch (error: any) {
        setStatus("error");
        setMessage(`❌ Connection error: ${error.message}`);
        console.error("Supabase connection error:", error);
      }
    }

    testConnection();
  }, []);

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-light mb-6">Supabase Connection Test</h1>
        
        <div className="border border-gray-200 p-6 rounded">
          <div className="mb-4">
            <strong>Status:</strong>{" "}
            <span
              className={
                status === "success"
                  ? "text-green-600"
                  : status === "error"
                  ? "text-red-600"
                  : "text-gray-600"
              }
            >
              {status === "loading" && "⏳ Testing..."}
              {status === "success" && "✅ Connected"}
              {status === "error" && "❌ Error"}
            </span>
          </div>
          
          <div className="mb-4">
            <strong>Message:</strong>
            <p className="mt-2 text-sm">{message}</p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="font-medium mb-2">Connection Details:</h2>
            <ul className="text-sm space-y-1">
              <li>
                <strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set"}
              </li>
              <li>
                <strong>Key:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
                  : "Not set"}
              </li>
            </ul>
          </div>

          {status === "success" && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                ✅ Your Supabase connection is working! You can now use it in your components.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Example usage:
              </p>
              <pre className="mt-2 p-3 bg-gray-100 text-xs overflow-x-auto">
{`import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('your_table')
  .select('*')`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

