
import { Plus, Minus, BarChart3, Download, Image, Table, FileText as FileIcon, FileDown } from 'lucide-react';

const ComparisonSummary = ({ comparison, onExportJson, onExportHtml, onExportPdf }) => {
  const { summary } = comparison;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Comparison Summary
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportJson}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Export JSON"
          >
            <Download className="h-4 w-4" />
            JSON
          </button>
          <button
            onClick={onExportHtml}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            title="Export HTML"
          >
            <FileIcon className="h-4 w-4" />
            HTML
          </button>
          <button
            onClick={onExportPdf}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Export PDF"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Additions</span>
          </div>
          <div className="text-2xl font-bold text-green-800">{summary.additions}</div>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
            <Minus className="h-5 w-5" />
            <span className="text-sm font-medium">Deletions</span>
          </div>
          <div className="text-2xl font-bold text-red-800">{summary.deletions}</div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-medium">Total Changes</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">{summary.changes}</div>
        </div>
      </div>

      {(summary.additions > 0 || summary.deletions > 0) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <Image className="h-4 w-4" />
            <span className="font-medium">Perfect Mutual Comparison:</span>
          </div>
          <div className="mt-2 text-sm text-blue-600">
            <p>• <strong>Preserved Spacing:</strong> Both documents maintain identical layout structure</p>
            <p>• <strong>Green Highlights:</strong> Content added in modified document (with placeholders in original)</p>
            <p>• <strong>Red Highlights:</strong> Content removed from original document (with placeholders in modified)</p>
            <p>• <strong>Yellow Highlights:</strong> Content modified between documents</p>
            <p>• <strong>Equal Height:</strong> Placeholders reserve exact space of missing content</p>
          </div>
        </div>
      )}

      {summary.changes === 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">No differences found between the documents.</p>
        </div>
      )}
    </div>
  );
};

export default ComparisonSummary; 