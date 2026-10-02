import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-3 mt-16">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-3 rounded-full border border-brand-900/10 text-brand-900/60 hover:bg-brand-900 hover:text-brand-50 hover:border-brand-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-brand-900/60 disabled:hover:border-brand-900/10 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="flex items-center space-x-2">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i + 1}
            onClick={() => onPageChange(i + 1)}
            className={`w-12 h-12 rounded-full font-medium transition-all duration-300 ${
              currentPage === i + 1
                ? 'bg-brand-900 text-brand-50 shadow-md'
                : 'text-brand-900/70 hover:bg-brand-900/5'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-3 rounded-full border border-brand-900/10 text-brand-900/60 hover:bg-brand-900 hover:text-brand-50 hover:border-brand-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-brand-900/60 disabled:hover:border-brand-900/10 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
