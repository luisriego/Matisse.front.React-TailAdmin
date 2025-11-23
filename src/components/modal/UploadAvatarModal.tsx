import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Modal } from '../ui/modal';

interface UploadAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAvatarUpload: () => void;
}

const UploadAvatarModal: React.FC<UploadAvatarModalProps> = ({ isOpen, onClose, userId, onAvatarUpload }) => {
  const [files, setFiles] = useState<(File & { preview: string })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
    );
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
    },
    onDrop,
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append('avatar', files[0]);

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/users/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.ok) {
        onAvatarUpload();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to upload avatar');
      }
    } catch (err) {
      setError('An error occurred while uploading the avatar');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md">
      <div className="no-scrollbar relative overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Upload Avatar</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Select an image to set as your new avatar.</p>
        </div>
        <div className="flex flex-col">
          <div className="px-2 pb-3">
            <div
              {...getRootProps()}
              className="flex h-48 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
            >
              <input {...getInputProps()} />
              {files.length > 0 ? (
                <img src={files[0].preview} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Drag 'n' drop an image here, or click to select one</p>
              )}
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
              disabled={files.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UploadAvatarModal;
