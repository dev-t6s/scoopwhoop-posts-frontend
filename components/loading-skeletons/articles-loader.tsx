import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

export default function ArticlesLoader () {
    return(
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Drafts</h1>
      
            <Skeleton className="w-[39rem] h-[6rem] rounded-lg mb-7"/>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">All Drafts</h2>
                <p className="text-sm text-gray-600 mt-1"></p>
            </div>
            
            <Skeleton className="bg-white rounded-lg shadow-lg overflow-hidden w-[87vw]">
                <div>
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