"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarIcon, Info, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@geist-ui/core";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import { toast } from "react-hot-toast";
import InternalServerErrorLogo from "@/public/internal-server-error.svg";
import TrendingLoader from "@/components/loading-skeletons/trending-loader";

interface TrendingSearch {
  highlight_title: string;
  trend_start_time: string;
  active: boolean;
  search_volume: number;
  percentage_volume_change: string;
  category: string[];
  query_keywords: string[];
  trend_id: string;
  scoopwhoop_headline: string;
}

interface TrendingData {
  trending_search_id: string;
  created_at: string;
  trending_searches_24: TrendingSearch[];
  trending_searches_4: TrendingSearch[];
}

interface CreationStatus {
  [trendId: string]: {
    status: "creating" | "polling" | "success" | "failed";
    progress: string;
  };
}

interface ModalStep {
  id: string;
  title: string;
  details?: string;
  status: "pending" | "running" | "completed" | "failed";
}

interface ModalState {
  isOpen: boolean;
  topicTitle: string;
  trendId: string | null;
  steps: ModalStep[];
  error: string | null;
}

interface TaskData {
  task_id: string;
  headline: string;
  content: string;
  imageWithTextUrl: string | null;
  imageWithoutTextUrl: string | null;
  selectedImageType: "with_text" | "without_text";
}

export default function TrendingPage() {
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24hrs" | "4hrs">(
    "24hrs"
  );
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    topicTitle: "",
    trendId: null,
    steps: [
      {
        id: "content-creation",
        title: "Creating task",
        status: "pending",
      },
      {
        id: "image-generation",
        title: "Generating content and image",
        status: "pending",
      },
    ],
    error: null,
  });
  const creationStatus: CreationStatus = {};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/news/trending`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLastRefreshed(data.last_updated);
        setTrendingData(data.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const closeModal = () => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleCreate = async (trendId: string, topicTitle: string) => {
    setModalState({
      isOpen: true,
      topicTitle,
      trendId,
      steps: [
        {
          id: "content-creation",
          title: "Creating task",
          status: "running",
        },
        {
          id: "image-generation",
          title: "Generating content and image",
          status: "pending",
        },
      ],
      error: null,
    });

    let taskId: string;
    let content: string;

    try {
      // Step 1: Create content
      const createResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/content/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            headline: topicTitle,
          }),
        }
      );

      if (!createResponse.ok) {
        toast.error(
          `Oops! Something went wrong while creating the draft: ${createResponse.status}`,
          {
            duration: 4000,
            position: "top-center",
          }
        );
        setModalState((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      const createData = await createResponse.json();
      taskId = createData.task_id;

      setModalState((prev) => ({
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === "content-creation"
            ? {
                ...step,
                status: "completed",
                details: "Content created successfully",
              }
            : step
        ),
      }));

      // Step 2: Poll for status
      setModalState((prev) => ({
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === "image-generation" ? { ...step, status: "running" } : step
        ),
      }));

      const pollStatus = async (): Promise<{
        status: string;
        content?: string;
      }> => {
        const statusResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/content/status/${taskId}`
        );
        if (!statusResponse.ok) {
          toast.error(
            `Oops! Something went wrong while creating the draft: ${statusResponse.status}`,
            {
              duration: 4000,
              position: "top-center",
            }
          );
          setModalState((prev) => ({ ...prev, isOpen: false }));
          return { status: "failed" };
        }
        return await statusResponse.json();
      };

      let currentStatus = "running";
      content = "";
      while (currentStatus === "running") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusData = await pollStatus();
        currentStatus = statusData.status;
        if (statusData.content) {
          content = statusData.content;
        }
      }

      if (currentStatus === "failed") {
        toast.error("Oops! Something went wrong while creating the draft", {
          duration: 4000,
          position: "top-center",
        });
        setModalState((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      // Complete the content generation step
      setModalState((prev) => ({
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === "image-generation"
            ? {
                ...step,
                status: "completed",
                details: "Content and Images generated successfully",
              }
            : step
        ),
      }));
    } catch (err) {
      console.error("Error in create process:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";

      toast.error(errorMessage, {
        duration: 4000,
        position: "top-center",
      });

      setModalState((prev) => ({ ...prev, isOpen: false }));
      return; // Exit early if content creation failed
    }

    // Fetch images outside the main try-catch block
    let imageWithTextUrl = null;
    try {
      const imageWithTextResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/content/image/${taskId}`
      );
      if (imageWithTextResponse.ok) {
        const imageWithTextBlob = await imageWithTextResponse.blob();
        imageWithTextUrl = URL.createObjectURL(imageWithTextBlob);
      }
    } catch (err) {
      console.warn("Failed to fetch image with text:", err);
    }

    let imageWithoutTextUrl = null;
    try {
      const imageWithoutTextResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/content/image/${taskId}?type=image_without_text`
      );
      if (imageWithoutTextResponse.ok) {
        const imageWithoutTextBlob = await imageWithoutTextResponse.blob();
        imageWithoutTextUrl = URL.createObjectURL(imageWithoutTextBlob);
      }
    } catch (err) {
      console.warn("Failed to fetch image without text:", err);
    }

    setSelectedTask({
      task_id: taskId,
      headline: topicTitle,
      content,
      imageWithTextUrl,
      imageWithoutTextUrl,
      selectedImageType: "with_text",
    });

    setModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleImageSelect = (type: "with_text" | "without_text") => {
    setSelectedTask((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        selectedImageType: type,
      };
    });
  };

  const handlePublish = async () => {
    if (!selectedTask) return;

    setIsPublishing(true);
    try {
      const publishResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/content/publish_draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task_id: selectedTask.task_id,
            image_type: `image_${selectedTask.selectedImageType}`,
          }),
        }
      );

      if (!publishResponse.ok) {
        throw new Error(`Failed to publish: ${publishResponse.status}`);
      }

      const publishData = await publishResponse.json();
      console.log(publishData);

      toast.success("Article published successfully!", {
        duration: 4000,
        position: "top-center",
      });

      setSelectedTask(null);
    } catch (err) {
      console.error("Error publishing:", err);
      toast.error("Oops! Something went wrong while creating the draft ", {
        duration: 4000,
        position: "top-center",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse '27-06-2025 11:10:00 AM IST' format
    const [datePart, timePart, period] = dateString.split(" ");
    const [day, month, year] = datePart.split("-");
    const [hours, minutes, seconds] = timePart.split(":");

    // Create date object
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      period === "PM" && hours !== "12"
        ? parseInt(hours) + 12
        : period === "AM" && hours === "12"
        ? 0
        : parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );

    return {
      formatted: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      fullDate: date,
      original: dateString,
    };
  };

  const DateCell = ({ search }: { search: { trend_start_time: string } }) => {
    const dateInfo = formatDate(search.trend_start_time);

    return (
      <div className="flex items-center space-x-2">
        <div className="flex flex-col font-mono gap-1">
          <div className="font-medium text-gray-900 w-max">
            {dateInfo.formatted}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{dateInfo.time}</span>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="border border-gray-200 shadow-lg bg-white p-0">
                <div className="p-3">
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-3">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Trend Start Time
                    </span>
                  </div>

                  {/* Calendar Component */}
                  <div className="flex flex-col space-y-3 relative">
                    <div className="relative">
                      <Calendar
                        mode="single"
                        selected={dateInfo.fullDate}
                        month={dateInfo.fullDate}
                        className="rounded-md border shadow-sm text-black"
                        captionLayout="dropdown"
                      />
                      <div className="absolute inset-0 bg-transparent z-10 cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  const displayedSearches =
    selectedTimeRange === "24hrs"
      ? trendingData?.trending_searches_24
      : trendingData?.trending_searches_4;

  if (loading) {
    return <TrendingLoader />;
  }

  if (error) {
    return (
      <div className="p-6 mx-auto flex justify-center items-center h-[95vh] w-[90vw]">
        <div>
          <Image
            src={InternalServerErrorLogo}
            alt="internal server logo"
            className="w-[30rem] h-auto"
          />
        </div>
      </div>
    );
  }

  if (!trendingData || Object.keys(trendingData).length === 0) {
    return (
      <div className="p-6 mx-auto flex justify-center items-center h-[95vh] w-[90vw]">
        <div className="text-xl font-medium">No trending data available</div>
      </div>
    );
  }

  return (
    <div className="p-6 mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Trending Searches
      </h1>

      {/* Progress Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 ring-1 ring-neutral-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Creating Content
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Topic:</span>{" "}
                  {modalState.topicTitle}
                </p>
              </div>

              <div className="space-y-3">
                {modalState.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        step.status === "completed"
                          ? "bg-green-100 text-green-600"
                          : step.status === "running"
                          ? "bg-blue-100 text-blue-600"
                          : step.status === "failed"
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : step.status === "running" ? (
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : step.status === "failed" ? (
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          step.status === "completed"
                            ? "text-green-900"
                            : step.status === "running"
                            ? "text-blue-900"
                            : step.status === "failed"
                            ? "text-red-900"
                            : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                      {step.details && (
                        <p className="text-xs text-gray-600 mt-1">
                          {step.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {modalState.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{modalState.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ring-1 ring-neutral-200">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedTask.headline || "Article Preview"}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Image selection section */}
              <div className="mb-6">
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => handleImageSelect("with_text")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedTask.selectedImageType === "with_text"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    Image with Text
                  </button>
                  <button
                    onClick={() => handleImageSelect("without_text")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedTask.selectedImageType === "without_text"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    Image without Text
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`relative w-full h-64 rounded-lg overflow-hidden border-2 ${
                      selectedTask.selectedImageType === "with_text"
                        ? "border-blue-500"
                        : "border-transparent"
                    }`}
                  >
                    {selectedTask.imageWithTextUrl ? (
                      <Image
                        src={selectedTask.imageWithTextUrl}
                        alt="Image with text"
                        fill
                        className="object-contain cursor-pointer"
                        onClick={() => handleImageSelect("with_text")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                        No image available
                      </div>
                    )}
                  </div>
                  <div
                    className={`relative w-full h-64 rounded-lg overflow-hidden border-2 ${
                      selectedTask.selectedImageType === "without_text"
                        ? "border-blue-500"
                        : "border-transparent"
                    }`}
                  >
                    {selectedTask.imageWithoutTextUrl ? (
                      <Image
                        src={selectedTask.imageWithoutTextUrl}
                        alt="Image without text"
                        fill
                        className="object-contain cursor-pointer"
                        onClick={() => handleImageSelect("without_text")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                        No image available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedTask.content && (
                <div className="prose max-w-none">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedTask.content}</ReactMarkdown>
                  </div>
                </div>
              )}

              {!selectedTask.content && (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    No content available for this article
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  isPublishing
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Publishing...
                  </>
                ) : (
                  "Publish Article"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Range Selection */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Time Range
          </label>
          <select
            value={selectedTimeRange}
            onChange={(e) =>
              setSelectedTimeRange(e.target.value as "24hrs" | "4hrs")
            }
            className="w-[300px] rounded-md cursor-pointer border italic border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
          >
            <option value="24hrs" className="italic">
              24 Hours Trending
            </option>
            <option value="4hrs" className="italic">
              4 Hours Trending
            </option>
          </select>
        </div>
        <div className="font-mono text-sm">
          Last refreshed:{" "}
          <span className="font-mono text-sm text-gray-600">
            {lastRefreshed ? lastRefreshed : "--"}
          </span>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">
              {selectedTimeRange === "24hrs"
                ? "24 Hours Trending"
                : "4 Hours Trending"}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {displayedSearches?.length || 0} trending search
              {displayedSearches?.length !== 1 ? "es" : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr className="">
                  <th className="py-3 pl-8 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ScoopWhoop Headline
                  </th>
                  <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Search Terms
                  </th>
                  <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend Start
                  </th>
                  <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedSearches?.map((search) => (
                  <tr key={search.trend_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 line-clamp-3">
                        {search.scoopwhoop_headline}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {search.query_keywords
                          .slice(0, 3)
                          .map((keyword, index: number) => {
                            // Different colors based on index
                            const colors = [
                              { color: "#297a3a", bg: "#ebfaeb" }, // green
                              { color: "#8a2be2", bg: "#f2eafa" }, // purple
                              { color: "#d35400", bg: "#fef0e6" }, // orange
                              { color: "#0066cc", bg: "#e6f2ff" }, // blue
                              { color: "#c41a16", bg: "#ffebeb" }, // red
                            ];
                            const colorIndex = index % colors.length;
                            return (
                              <div
                                key={index}
                                className="flex items-center space-x-2"
                              >
                                <Badge
                                  style={{
                                    color: colors[colorIndex].color,
                                    backgroundColor: colors[colorIndex].bg,
                                    minWidth: "max-content",
                                  }}
                                  scale={0.8}
                                  paddingLeft="10px"
                                  paddingRight="10px"
                                  padding="6px"
                                >
                                  {keyword}
                                </Badge>
                              </div>
                            );
                          })}
                        {search.query_keywords.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-xs text-gray-400 cursor-pointer">
                                +{search.query_keywords.length - 3} more
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="border">
                              <ScrollArea className="h-72 w-80 rounded-md">
                                <div className="p-1 flex flex-col justify-start gap-3">
                                  {search.query_keywords.map(
                                    (keyword, index) => {
                                      const colors = [
                                        { color: "#297a3a", bg: "#ebfaeb" },
                                        { color: "#8a2be2", bg: "#f2eafa" },
                                        { color: "#d35400", bg: "#fef0e6" },
                                        { color: "#0066cc", bg: "#e6f2ff" },
                                        { color: "#c41a16", bg: "#ffebeb" },
                                      ];
                                      const colorIndex = index % colors.length;
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-center space-x-2"
                                        >
                                          <Badge
                                            style={{
                                              color: colors[colorIndex].color,
                                              backgroundColor:
                                                colors[colorIndex].bg,
                                              minWidth: "max-content",
                                            }}
                                            scale={0.8}
                                            paddingLeft="10px"
                                            paddingRight="10px"
                                            padding="6px"
                                          >
                                            {keyword}
                                          </Badge>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </ScrollArea>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 w-max rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                          {search.search_volume.toLocaleString()} searches
                        </span>
                        <span className="text-xs text-green-800 bg-green-100 w-max px-2 py-0.5 rounded-full">
                          {search.percentage_volume_change} increase
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <DateCell search={search} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {search.category.map((cat, index) => (
                          <Badge
                            key={index}
                            style={{
                              color: "#7820bc",
                              backgroundColor: "#f9f1fe",
                            }}
                            scale={0.8}
                            paddingLeft="10px"
                            paddingRight="10px"
                            padding="6px"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() =>
                            handleCreate(
                              search.trend_id,
                              search.scoopwhoop_headline
                            )
                          }
                          disabled={
                            creationStatus[search.trend_id]?.status ===
                              "creating" ||
                            creationStatus[search.trend_id]?.status ===
                              "polling"
                          }
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                            creationStatus[search.trend_id]?.status ===
                              "creating" ||
                            creationStatus[search.trend_id]?.status ===
                              "polling"
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : creationStatus[search.trend_id]?.status ===
                                "failed"
                              ? "bg-red-100 text-red-800 hover:bg-red-200"
                              : "bg-green-100 text-green-800 hover:bg-green-200"
                          }`}
                        >
                          {creationStatus[search.trend_id]?.status ===
                            "creating" ||
                          creationStatus[search.trend_id]?.status === "polling"
                            ? "Processing..."
                            : creationStatus[search.trend_id]?.status ===
                              "failed"
                            ? "Retry"
                            : "Create"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
