"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import InternalServerErrorLogo from "@/public/internal-server-error.svg";
import ArticlesLoader from "@/components/loading-skeletons/articles-loader";

interface TaskData {
  task_id: string;
  status: string;
  headline?: string;
  content?: string;
  imageWithTextUrl?: string;
  imageWithoutTextUrl?: string;
  published_image?: string;
  error?: string;
}

export default function ArticlesPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
    step: "Fetching task IDs...",
  });
  const [publishingTasks, setPublishingTasks] = useState<
    Record<string, boolean>
  >({});
  const [selectedImageType, setSelectedImageType] = useState<
    "with_text" | "without_text"
  >("with_text");

  useEffect(() => {
    const fetchArticlesData = async () => {
      try {
        setLoadingProgress({
          current: 0,
          total: 0,
          step: "Fetching task IDs...",
        });

        // Step 1: Get all task IDs
        const taskIdsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/content/task_ids`
        );
        if (!taskIdsResponse.ok) {
          throw new Error(
            `Failed to fetch task IDs: ${taskIdsResponse.status}`
          );
        }

        const taskIdsData = await taskIdsResponse.json();
        const taskIds: string[] = taskIdsData.task_ids || [];

        if (taskIds.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        setLoadingProgress({
          current: 0,
          total: taskIds.length,
          step: "Checking task statuses...",
        });

        // Step 2: Check status for each task ID
        const taskDataPromises = taskIds.map(async (taskId, index) => {
          try {
            // Update progress
            setLoadingProgress((prev) => ({
              ...prev,
              current: index + 1,
              step: `Checking status for task ${index + 1} of ${
                taskIds.length
              }...`,
            }));

            const statusResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/content/status/${taskId}`
            );
            if (!statusResponse.ok) {
              return {
                task_id: taskId,
                status: "error",
                error: `Failed to fetch status: ${statusResponse.status}`,
              };
            }

            const statusData = await statusResponse.json();
            const taskData: TaskData = {
              task_id: taskId,
              status: statusData.status,
              headline: statusData.headline,
              content: statusData.content,
              published_image: statusData.published_image,
            };

            // Step 3: If status is success, get both images
            if (
              statusData.status === "success" ||
              statusData.status === "published"
            ) {
              try {
                // Get image with text
                const imageWithTextResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/content/image/${taskId}?type=image_with_text`
                );
                if (imageWithTextResponse.ok) {
                  const imageBlob = await imageWithTextResponse.blob();
                  const imageUrl = URL.createObjectURL(imageBlob);
                  taskData.imageWithTextUrl = imageUrl;
                }

                // Get image without text
                const imageWithoutTextResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/content/image/${taskId}?type=image_without_text`
                );
                if (imageWithoutTextResponse.ok) {
                  const imageBlob = await imageWithoutTextResponse.blob();
                  const imageUrl = URL.createObjectURL(imageBlob);
                  taskData.imageWithoutTextUrl = imageUrl;
                }

                if (!imageWithTextResponse.ok && !imageWithoutTextResponse.ok) {
                  taskData.error = `Failed to fetch images: ${imageWithTextResponse.status}`;
                }
              } catch (imgError) {
                taskData.error = `Image fetch error: ${
                  imgError instanceof Error ? imgError.message : "Unknown error"
                }`;
              }
            }

            return taskData;
          } catch (taskError) {
            return {
              task_id: taskId,
              status: "error",
              error:
                taskError instanceof Error
                  ? taskError.message
                  : "Unknown error",
            };
          }
        });

        const allTaskData = await Promise.all(taskDataPromises);
        // Filter out failed tasks
        const filteredTasks = allTaskData.filter(
          (task) => task.status !== "failed"
        );
        setTasks(filteredTasks);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchArticlesData();

    // Cleanup function to revoke object URLs
    return () => {
      tasks.forEach((task) => {
        if (task.imageWithTextUrl) URL.revokeObjectURL(task.imageWithTextUrl);
        if (task.imageWithoutTextUrl)
          URL.revokeObjectURL(task.imageWithoutTextUrl);
      });
    };
  }, []);

  const handlePublish = async (taskId: string) => {
    setPublishingTasks((prev) => ({ ...prev, [taskId]: true }));

    try {
      const publishResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/content/publish_draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task_id: taskId,
            image_type: `image_${selectedImageType}`,
          }),
        }
      );

      if (!publishResponse.ok) {
        throw new Error(`Failed to publish: ${publishResponse.status}`);
      }

      toast.success("Article published successfully!", {
        duration: 4000,
        position: "top-center",
      });

      // Update the task status in the UI
      setTasks((prev) =>
        prev.map((task) =>
          task.task_id === taskId ? { ...task, status: "published" } : task
        )
      );

      // Close the modal
      setSelectedTask(null);
    } catch (err) {
      console.error("Error publishing:", err);
      toast.error("Failed to publish article. Please try again.", {
        duration: 4000,
        position: "top-center",
      });
    } finally {
      setPublishingTasks((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleImageSelect = (type: "with_text" | "without_text") => {
    setSelectedImageType(type);
  };

  const handlePublishClick = (task: TaskData) => {
    setSelectedTask(task);
    // Reset image selection to default
    setSelectedImageType("with_text");
  };

  if (loading) {
    return (
      <div>
        <div className="hidden">{loadingProgress.current}</div>
        <ArticlesLoader />
      </div>
    );
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

  return (
    <div className="p-6 w-screen max-w-[94vw] 2xl:max-w-[96vw] overflow-x-auto">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Drafts</h1>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
          <div className="text-sm text-gray-600">Total Articles</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">
            {tasks.filter((t) => t.status === "published").length}
          </div>
          <div className="text-sm text-gray-600">Published</div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-xl font-medium text-gray-500">
            No articles found
          </div>
          <div className="text-sm text-gray-400 mt-2">
            No non-failed tasks were returned from the server
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">All Drafts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {tasks.length} draft{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Headline
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.task_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {task.headline || "No headline available"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === "success"
                            ? "bg-green-100 text-green-800"
                            : task.status === "running"
                            ? "bg-blue-100 text-blue-800"
                            : task.status === "published"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {task.status === "success" ? "draft" : task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {task.published_image === "image_with_text" &&
                      task.imageWithTextUrl ? (
                        <div className="flex items-center">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={task.imageWithTextUrl}
                              alt={`Image for ${task.headline || task.task_id}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          </div>
                        </div>
                      ) : task.published_image === "image_without_text" &&
                        task.imageWithoutTextUrl ? (
                        <div className="flex items-center">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={task.imageWithoutTextUrl}
                              alt={`Image for ${task.headline || task.task_id}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          </div>
                        </div>
                      ) : task.status === "success" ? (
                        <div className="text-sm text-gray-400">
                          No Image Published
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">
                          No image available
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="inline-flex items-center h-max w-max cursor-pointer px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Open
                        </button>
                        {task.status !== "success" && task.imageWithTextUrl && (
                          <button
                            onClick={() =>
                              window.open(task.imageWithTextUrl, "_blank")
                            }
                            className="inline-flex items-center h-max w-max px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md cursor-pointer text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View Image
                          </button>
                        )}
                        {task.status === "published" ? (
                          ""
                        ) : (
                          <button
                            onClick={() => handlePublishClick(task)}
                            disabled={
                              publishingTasks[task.task_id] ||
                              task.status === "published"
                            }
                            className={`inline-flex items-center px-3 py-1.5 cursor-pointer h-max w-max border border-transparent text-xs font-medium rounded-md ${
                              publishingTasks[task.task_id]
                                ? "bg-gray-400 cursor-not-allowed"
                                : task.status === "published"
                                ? "bg-purple-600 hover:bg-purple-700"
                                : "bg-green-600 hover:bg-green-700"
                            } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                          >
                            {publishingTasks[task.task_id] ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                Publishing...
                              </>
                            ) : task.status === "published" ? (
                              "Published"
                            ) : (
                              "Publish"
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ring-1 ring-neutral-300">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedTask.headline || "Publish Article"}
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
              {selectedTask.status !== "published" ? (
                <div className="mb-6">
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => handleImageSelect("with_text")}
                      className={`px-3 py-1 rounded-md text-sm ${
                        selectedImageType === "with_text"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      Image with Text
                    </button>
                    <button
                      onClick={() => handleImageSelect("without_text")}
                      className={`px-3 py-1 rounded-md text-sm ${
                        selectedImageType === "without_text"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      Image without Text
                    </button>
                  </div>

                  <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden bg-gray-100">
                    {selectedImageType === "with_text" &&
                    selectedTask.imageWithTextUrl ? (
                      <Image
                        src={selectedTask.imageWithTextUrl}
                        alt="Image with text"
                        fill
                        className="object-contain"
                      />
                    ) : selectedImageType === "without_text" &&
                      selectedTask.imageWithoutTextUrl ? (
                      <Image
                        src={selectedTask.imageWithoutTextUrl}
                        alt="Image without text"
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No image available
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden bg-gray-100">
                  {selectedTask.published_image === "image_with_text" &&
                  selectedTask.imageWithTextUrl ? (
                    <Image
                      src={selectedTask.imageWithTextUrl}
                      alt="Image with text"
                      fill
                      className="object-contain"
                    />
                  ) : selectedTask.published_image === "image_without_text" &&
                    selectedTask.imageWithoutTextUrl ? (
                    <Image
                      src={selectedTask.imageWithoutTextUrl}
                      alt="Image without text"
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No image available
                    </div>
                  )}
                </div>
              )}

              {/* Content preview */}
              {selectedTask.content && (
                <div className="prose max-w-none mb-6">
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

              {/* Publish button */}
              {selectedTask.status !== "published" ? (
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handlePublish(selectedTask.task_id)}
                    disabled={publishingTasks[selectedTask.task_id]}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                      publishingTasks[selectedTask.task_id]
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {publishingTasks[selectedTask.task_id] ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Publishing...
                      </>
                    ) : (
                      "Publish Article"
                    )}
                  </button>
                </div>
              ) : (
                ""
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
