import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

export default function CacheInvalidationLoader () {
    return(
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Cache Invalidations</h1>
      
            <Skeleton className="w-[25rem] h-[5rem] mb-7 mt-9"/>

            <div className="bg-white shadow-lg overflow-hidden">
            
            <Skeleton className="bg-white shadow-lg overflow-hidden w-[90vw]">
                <div>
                    <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Message
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time Taken (seconds)
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time Taken (seconds)
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created At
                        </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        <tr className="w-full h-[35rem] 2xl:h-[50rem] relative">
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