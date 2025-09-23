import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

export default function HomeLoader () {
    return(
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">News Categories</h1>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Category
            </label>
            <div className="flex justify-between items-end mb-5">
                <Skeleton className="h-10 w-[17rem] rounded-md"/>
                <Skeleton className="h-4 w-[17rem] rounded-md"/>
            </div>
            <div className="space-y-8">
                <Skeleton className="bg-white rounded-lg shadow-lg overflow-hidden w-[87vw]">
                    <div className="bg-blue-600 text-white p-4 py-10">
                    </div>
                    
                    <div className="">
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
                            <tbody className="bg-white divide-y divide-gray-200 w-full">
                            <tr className="w-full h-[35rem] 2xl:h-[60rem] relative">
                                <td colSpan={6} className="absolute inset-0 flex justify-center items-center">
                                    <Loader2 className="w-10 h-10 animate-spin" />
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        </div>
                </Skeleton>
            </div>
        </div>   
    )
}