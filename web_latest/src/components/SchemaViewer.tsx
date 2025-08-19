import React, { useState, useEffect } from 'react';
import { Code, Save, Pencil, RefreshCw, X } from 'lucide-react';

interface SchemaViewerProps {
  onClose: () => void;
  schemaName: string;
  version: string;
  content: string;
  onEdit?: (updatedContent: string) => void;
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({ 
  onClose, 
  schemaName, 
  version, 
  content,
  onEdit
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formattedSchema, setFormattedSchema] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      setFormattedSchema(JSON.stringify(parsed, null, 2));
      setEditedContent(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setFormattedSchema(content);
      setEditedContent(content);
    }
  }, [content]);

  useEffect(() => {
    setHasChanges(editedContent !== formattedSchema);
  }, [editedContent, formattedSchema]);

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
  };

  const handleSave = () => {
    // Validate JSON
    try {
      JSON.parse(editedContent);
    } catch (err) {
      setError('Invalid JSON format. Please check your schema syntax.');
      return;
    }
    
    setError(null);
    setIsEditing(false);
    setHasChanges(false);
    
    // Update the formatted schema with the new content
    setFormattedSchema(editedContent);
    
    // Notify parent component about the edit
    if (onEdit) {
      onEdit(editedContent);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Schema Details</h3>
              <p className="text-sm text-gray-600">
                {schemaName} ({version})
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
                className="p-2 text-blue-600 hover:text-blue-700 rounded-lg transition-colors"
                title="Edit Schema"
              >
                <Pencil size={20} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="p-2 text-blue-600 hover:text-blue-700 rounded-lg transition-colors"
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

        <div className="flex-1 overflow-hidden">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full bg-gray-50 p-4 rounded-lg font-mono text-sm resize-none border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your JSON schema here..."
            />
          ) : (
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto h-full text-sm font-mono border border-gray-200">
              {formattedSchema}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchemaViewer;