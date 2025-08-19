import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Pencil, RefreshCw, X } from 'lucide-react';

interface PromptViewerProps {
  onClose: () => void;
  promptName: string;
  version: string;
  content: string;
  onEdit?: (updatedContent: string) => void;
}

const PromptViewer: React.FC<PromptViewerProps> = ({ 
  onClose, 
  promptName, 
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
            <Sparkles className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Prompt Details</h3>
              <p className="text-sm text-gray-600">
                {promptName} ({version})
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
                className="p-2 text-purple-600 hover:text-purple-700 rounded-lg transition-colors"
                title="Edit Prompt"
              >
                <Pencil size={20} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="p-2 text-purple-600 hover:text-purple-700 rounded-lg transition-colors"
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
              className="w-full h-[60vh] bg-gray-50 p-4 rounded-lg font-mono text-sm resize-none border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter your prompt here..."
            />
          ) : (
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[60vh]">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptViewer;