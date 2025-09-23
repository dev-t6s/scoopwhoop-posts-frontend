'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function Breadcrumbs() {
  const pathname = usePathname()
  
  const paths = pathname.split('/').filter(Boolean)
  
  return (
    <div className="flex items-center gap-2">
      {paths.length > 0 ? (
        <>
          <Link href="/" className="text-gray-600 hover:underline">Home</Link>
          {paths.map((path, index) => (
            <div key={index} className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              <Link 
                href={`/${paths.slice(0, index + 1).join('/')}`}
                className="text-gray-600 hover:underline capitalize"
              >
                {path}
              </Link>
            </div>
          ))}
        </>
      ) : (
        <Link href="/" className="text-gray-600 hover:underline">Home</Link>
      )}
    </div>
  )
}