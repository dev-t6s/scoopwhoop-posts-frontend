'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import InternalServerErrorLogo from '@/public/internal-server-error.svg';
import HomeLoader from '@/components/loading-skeletons/home-loader';

interface Publisher {
  publisher_name: string;
  no_of_articles: number;
  icon_url: string;
}

interface Topic {
  topic_id: number;
  topic_title: string;
  scoopwhoop_headline: string;
  n_articles: number;
  first_published: string;
  latest_published: string;
  publishers: Publisher[];
}

interface Category {
  category_id: number;
  category_name: string;
  topics: Topic[];
}

interface CreationStatus {
  [topicId: number]: {
    status: 'creating' | 'polling' | 'success' | 'failed';
    progress: string;
  };
}

interface ModalStep {
  id: string;
  title: string;
  details?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface ModalState {
  isOpen: boolean;
  topicTitle: string;
  topicId: number | null;
  steps: ModalStep[];
  error: string | null;
}

interface TaskData {
  task_id: string;
  headline: string;
  content: string;
  imageWithTextUrl: string | null;
  imageWithoutTextUrl: string | null;
  selectedImageType: 'with_text' | 'without_text';
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    topicTitle: '',
    topicId: null,
    steps: [
      {
        id: 'content-creation',
        title: 'Creating task',
        status: 'pending'
      },
      {
        id: 'image-generation',
        title: 'Generating content and image',
        status: 'pending'
      }
    ],
    error: null
  });
  const creationStatus: CreationStatus = {};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/news/current`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLastRefreshed(data.last_updated)
        setCategories(data ? data.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const closeModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const handleCreate = async (topicId: number, topicTitle: string) => {
    setModalState({
      isOpen: true,
      topicTitle,
      topicId,
      steps: [
        {
          id: 'content-creation',
          title: 'Creating task',
          status: 'running'
        },
        {
          id: 'image-generation',
          title: 'Generating content and image',
          status: 'pending'
        }
      ],
      error: null
    });

    let taskId: string;
    let content: string;

    try {
      // Step 1: Create content
      const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headline: topicTitle
        })
      });

      if (!createResponse.ok) {
        toast.error(`Oops! Something went wrong while creating the draft: ${createResponse.status}`, {
          duration: 4000,
          position: 'top-center',
        });
        setModalState(prev => ({ ...prev, isOpen: false }));
        return;
      }

      const createData = await createResponse.json();
      taskId = createData.task_id;
      
      setModalState(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'content-creation' 
            ? {...step, status: 'completed', details: 'Content created successfully'} 
            : step
        )
      }));

      // Step 2: Poll for status
      setModalState(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'image-generation' ? {...step, status: 'running'} : step
        )
      }));

      const pollStatus = async (): Promise<{status: string, content?: string}> => {
        const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/status/${taskId}`);
        if (!statusResponse.ok) {
          toast.error(`Oops! Something went wrong while creating the draft: ${statusResponse.status}`, {
            duration: 4000,
            position: 'top-center',
          });
          setModalState(prev => ({ ...prev, isOpen: false }));
          return { status: 'failed' };
        }
        return await statusResponse.json();
      };

      let currentStatus = 'running';
      content = '';
      while (currentStatus === 'running') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusData = await pollStatus();
        currentStatus = statusData.status;
        if (statusData.content) {
          content = statusData.content;
        }
      }

      if (currentStatus === 'failed') {
        toast.error('Oops! Something went wrong while creating the draft', {
          duration: 4000,
          position: 'top-center',
        });
        setModalState(prev => ({ ...prev, isOpen: false }));
        return;
      }

      // Complete the content generation step
      setModalState(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'image-generation' 
            ? {...step, status: 'completed', details: 'Content and Images generated successfully'} 
            : step
        )
      }));

    } catch (err) {
      console.error('Error in create process:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
      });

      setModalState(prev => ({ ...prev, isOpen: false }));
      return; // Exit early if content creation failed
    }

    // Fetch images outside the main try-catch block
    let imageWithTextUrl = null;
    try {
      const imageWithTextResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/image/${taskId}`);
      if (imageWithTextResponse.ok) {
        const imageWithTextBlob = await imageWithTextResponse.blob();
        imageWithTextUrl = URL.createObjectURL(imageWithTextBlob);
      }
    } catch (err) {
      imageWithTextUrl = null;
      console.warn('Failed to fetch image with text:', err);
    }

    let imageWithoutTextUrl = null;
    try {
      const imageWithoutTextResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/image/${taskId}?type=image_without_text`);
      if (imageWithoutTextResponse.ok) {
        const imageWithoutTextBlob = await imageWithoutTextResponse.blob();
        imageWithoutTextUrl = URL.createObjectURL(imageWithoutTextBlob);
      }
    } catch (err) {
      imageWithoutTextUrl = null;
      console.warn('Failed to fetch image without text:', err);
    }

    setSelectedTask({
      task_id: taskId,
      headline: topicTitle,
      content,
      imageWithTextUrl,
      imageWithoutTextUrl,
      selectedImageType: 'with_text'
    });

    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // const handlePreviewClick = () => {
  //   setModalState(prev => ({ ...prev, isOpen: false }));
  // };

  const handleImageSelect = (type: 'with_text' | 'without_text') => {
    setSelectedTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        selectedImageType: type
      };
    });
  };

  const handlePublish = async () => {
    if (!selectedTask) return;

    setIsPublishing(true);
    try {
      const publishResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/publish_draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: selectedTask.task_id,
          image_type: `image_${selectedTask.selectedImageType}`
        })
      });

      if (!publishResponse.ok) {
        throw new Error(`Failed to publish: ${publishResponse.status}`);
      }

      const publishData = await publishResponse.json();
      console.log(publishData)

      toast.success('Article published successfully!', {
        duration: 4000,
        position: 'top-center',
      });

      setSelectedTask(null);
    } catch (err) {
      console.error('Error publishing:', err);
      toast.error('Failed to publish article. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedCategory = selectedCategoryId === 'all' 
    ? null 
    : categories.find(cat => cat.category_id.toString() === selectedCategoryId);

  const displayCategories = selectedCategoryId === 'all' ? categories : (selectedCategory ? [selectedCategory] : []);

  if (loading) {
    return <HomeLoader/>;
  }

  if (error) {
    return (
      <div className="p-6 mx-auto flex justify-center items-center h-[95vh] w-[90vw]">
        <div>
          <Image
            src={InternalServerErrorLogo}
            alt='internal server logo'
            className='w-[30rem] h-auto'
          />
        </div>
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="p-6 mx-auto flex justify-center items-center h-[95vh] w-[90vw]">
        <div className="text-xl font-medium">No news data available</div>
      </div>
    );
  }

  return (
    <div className="p-6 mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">News Categories</h1>
      
      {/* Progress Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 ring-1 ring-neutral-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Creating Content</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Topic:</span> {modalState.topicTitle}
                </p>
              </div>

              <div className="space-y-3">
                {modalState.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      step.status === 'completed' 
                        ? 'bg-green-100 text-green-600' 
                        : step.status === 'running'
                        ? 'bg-blue-100 text-blue-600'
                        : step.status === 'failed'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.status === 'completed' ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : step.status === 'running' ? (
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : step.status === 'failed' ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        step.status === 'completed' 
                          ? 'text-green-900' 
                          : step.status === 'running'
                          ? 'text-blue-900'
                          : step.status === 'failed'
                          ? 'text-red-900'
                          : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                      {step.details && (
                        <p className="text-xs text-gray-600 mt-1">{step.details}</p>
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
                {selectedTask.headline || 'Article Preview'}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Image selection section */}
              <div className="mb-6">
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => handleImageSelect('with_text')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedTask.selectedImageType === 'with_text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Image with Text
                  </button>
                  <button
                    onClick={() => handleImageSelect('without_text')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedTask.selectedImageType === 'without_text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Image without Text
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`relative w-full h-64 rounded-lg overflow-hidden border-2 ${
                    selectedTask.selectedImageType === 'with_text' 
                      ? 'border-blue-500' 
                      : 'border-transparent'
                  }`}>
                    {selectedTask.imageWithTextUrl ? (
                      <Image
                        src={selectedTask.imageWithTextUrl}
                        alt="Image with text"
                        fill
                        className="object-contain cursor-pointer"
                        onClick={() => handleImageSelect('with_text')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                        No image available
                      </div>
                    )}
                  </div>
                  <div className={`relative w-full h-64 rounded-lg overflow-hidden border-2 ${
                    selectedTask.selectedImageType === 'without_text' 
                      ? 'border-blue-500' 
                      : 'border-transparent'
                  }`}>
                    {selectedTask.imageWithoutTextUrl ? (
                      <Image
                        src={selectedTask.imageWithoutTextUrl}
                        alt="Image without text"
                        fill
                        className="object-contain cursor-pointer"
                        onClick={() => handleImageSelect('without_text')}
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
                  <div className="text-gray-500">No content available for this article</div>
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
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Publishing...
                  </>
                ) : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Category
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-[300px] rounded-md border cursor-pointer italic border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
          >
            <option value="all" className='italic'>All Categories</option>
            {categories.map((category) => (
              <option 
                key={category.category_id} 
                value={category.category_id.toString()}
                className='italic'
              >
                {category.category_name}
              </option>
            ))}
          </select>
        </div>
        <div className='font-mono text-sm'>Last refreshed: <span className='font-mono text-sm text-gray-600'>{lastRefreshed ? lastRefreshed : '--'}</span></div>
      </div>
      
      <div className="space-y-8">
        {displayCategories.map((category) => (
          <div key={category.category_id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">{category.category_name}</h2>
              <p className="text-blue-100 text-sm mt-1">
                {category.topics.length} topic{category.topics.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left">
                  <tr className=''>
                    <th className="py-3 pl-8 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ScoopWhoop Headline
                    </th>
                    <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articles
                    </th>
                    <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latest Published
                    </th>
                    <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Publishers
                    </th>
                    <th className="py-3 pl-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {category.topics.map((topic) => (
                    <tr key={topic.topic_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 line-clamp-3">
                          {topic.scoopwhoop_headline}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 line-clamp-3">
                          {topic.topic_title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {topic.n_articles}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>
                          {new Date(topic.latest_published).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          First: {new Date(topic.first_published).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {topic.publishers.slice(0, 3).map((publisher, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Image
                                src={publisher.icon_url} 
                                alt={publisher.publisher_name}
                                width={16}
                                height={16}
                                className="w-4 h-4 rounded"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <span className="text-xs text-gray-600">
                                {publisher.publisher_name} ({publisher.no_of_articles})
                              </span>
                            </div>
                          ))}
                          {topic.publishers.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-gray-400">
                                  +{topic.publishers.length - 3} more
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className='border'>
                                <ScrollArea className="h-72 w-48 rounded-md">
                                  <div className="p-4 flex flex-col justify-start gap-3">
                                    {topic.publishers.map((publisher, index) => (
                                      <div key={index} className="flex items-center space-x-2">
                                        <Image
                                          src={publisher.icon_url} 
                                          alt={publisher.publisher_name}
                                          width={16}
                                          height={16}
                                          className="w-4 h-4 rounded"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                        <span className="text-xs text-gray-600">
                                          {publisher.publisher_name} ({publisher.no_of_articles})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {topic.topic_title && topic.topic_title.trim() !== '' && (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleCreate(topic.topic_id, topic.topic_title)}
                              disabled={creationStatus[topic.topic_id]?.status === 'creating' || 
                                       creationStatus[topic.topic_id]?.status === 'polling'}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                                creationStatus[topic.topic_id]?.status === 'creating' || 
                                creationStatus[topic.topic_id]?.status === 'polling'
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : creationStatus[topic.topic_id]?.status === 'failed'
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              {creationStatus[topic.topic_id]?.status === 'creating' || 
                               creationStatus[topic.topic_id]?.status === 'polling'
                                ? 'Processing...'
                                : creationStatus[topic.topic_id]?.status === 'failed'
                                ? 'Retry'
                                : 'Create'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}