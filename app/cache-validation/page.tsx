"use client";

import CacheInvalidationLoader from "@/components/loading-skeletons/cache-invalidation-loader";
import { useEffect, useState } from "react";
import { toast, Toaster } from "react-hot-toast";

interface Invalidtion {
  id: number;
  status: string;
  message: string;
  time_taken_seconds: number;
  created_at: string;
}

export default function CacheValidation() {
  const [invalidations, setInvalidations] = useState<Invalidtion[]>([]);
  const [daily_count, setDailyCount] = useState<number | null>(null);
  const [monthly_count, setMonthlyCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalidating, setInvalidating] = useState(false);

  const fetchInvalidationsHistory = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cache/get_invalidations_history?limit=100`
      );
      const data = await response.json();
      setInvalidations(data.invalidations || []);
      setDailyCount(data.daily_count);
      setMonthlyCount(data.monthly_count);
    } catch (error) {
      console.error("Error fetching invalidations history:", error);
      toast.error("Failed to fetch invalidations history");
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateCache = async () => {
    if (invalidations.length > 0) {
      setInvalidating(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/cache/invalidate_cache`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        if (data.status === "success") {
          toast.success(data.message);
          // Refresh the invalidations history after successful invalidation
          fetchInvalidationsHistory();
        } else if (response.status === 429) {
          const message = data.detail
            ? `${data.detail.remaining_minutes} minutes`
            : "a while";
          toast.error(`Too many requests. Please try again after ${message}.`);
        } else {
          toast.error(data.message || "Try after 5 minutes");
        }
      } catch (error) {
        console.error("Error invalidating cache:", error);
        toast.error("Failed to invalidate cache");
      } finally {
        setInvalidating(false);
      }
    }
  };

  useEffect(() => {
    fetchInvalidationsHistory();
  }, []);

  if (loading) {
    return (
      <div>
        <CacheInvalidationLoader />
      </div>
    );
  }

  return (
    <div className="p-6 w-[95vw]">
      <Toaster />
      <h1 className="text-3xl font-bold text-gray-800">Cache Invalidations</h1>
      <div className="flex justify-between items-end my-6 mt-10">
        <div className="bg-white p-4 rounded-lg shadow-sm border w-[30%]">
          <div className="text-2xl font-bold text-gray-900">
            {daily_count != null && daily_count >= 0
              ? 10 - daily_count / 2
              : "---"}
          </div>
          <div className="text-sm text-gray-600">Daily Invalidations Left</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border w-[30%]">
          <div className="text-2xl font-bold text-gray-900">
            {monthly_count != null && monthly_count > 0
              ? 100 - monthly_count / 2
              : "---"}
          </div>
          <div className="text-sm text-gray-600">
            Monthly Invalidations Left
          </div>
        </div>

        <button
          onClick={handleInvalidateCache}
          disabled={invalidating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
        >
          {invalidating ? "Invalidating..." : "Invalidate Cache"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Taken (seconds)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invalidations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No invalidations found
                </td>
              </tr>
            ) : (
              invalidations.map((invalidation) => (
                <tr key={invalidation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {invalidation.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-center ${
                        invalidation.status === "success"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {invalidation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {invalidation.message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {invalidation.time_taken_seconds?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {invalidation.created_at}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
