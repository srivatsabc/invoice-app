import React, { useState, useEffect } from 'react';
import { Zap, Save, Pencil, RefreshCw, X } from 'lucide-react';

interface SpecialInstructionsViewerProps {
  onClose: () => void;
  instructionsName: string;
  version: string;
  content: string;
  onEdit?: (updatedContent: string) => void;
}

const SpecialInstructionsViewer: React.FC<SpecialInstructionsViewerProps> = ({ 
  onClose, 
  instructionsName, 
  version, 
  content,
  onEdit
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(editedContent !== content);
  }, [editedContent, content]);

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
  };

  const handleSave = () => {
    setError(null);
    setIsEditing(false);
    setHasChanges(false);
    
    // Notify parent component about the edit
    if (onEdit) {
      onEdit(editedContent);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Special Instructions</h3>
              <p className="text-sm text-gray-600">
                {instructionsName} ({version})
                {hasChanges && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Modified
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-orange-600 hover:text-orange-700 rounded-lg transition-colors"
                title="Edit Special Instructions"
              >
                <Pencil size={20} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="p-2 text-orange-600 hover:text-orange-700 rounded-lg transition-colors"
                title="Save Changes"
              >
                <Save size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        <div className="prose max-w-none">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-[60vh] bg-gray-50 p-4 rounded-lg text-sm resize-none border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter special instructions here..."
            />
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[60vh]">
              {content ? (
                <pre className="whitespace-pre-wrap text-sm">{content}</pre>
              ) : (
                <p className="text-gray-500 italic">No special instructions provided</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialInstructionsViewer;