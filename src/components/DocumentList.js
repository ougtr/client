import { useState } from 'react';
import { ASSET_URL } from '../api/http';

const formatDate = (value) => {
  if (!value) {
    return '';
  }
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
};

const DocumentList = ({ documents = [], canDelete = false, onDelete }) => {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (event, document) => {
    event.preventDefault();
    if (!canDelete || !onDelete) {
      return;
    }
    const confirmed = window.confirm('Supprimer ce document ?');
    if (!confirmed) {
      return;
    }
    setDeletingId(document.id);
    try {
      await onDelete(document);
    } finally {
      setDeletingId(null);
    }
  };

  if (!documents.length) {
    return <p className="muted">Aucun document disponible.</p>;
  }

  return (
    <div className="document-table">
      <div className="document-table-head">
        <div>Nom du fichier</div>
        <div>Date d&apos;ajout</div>
        <div className="document-head-actions">Actions</div>
      </div>
      {documents.map((doc) => {
        const displayName = doc.nomOriginal || doc.fichier?.split('/').pop() || `Document ${doc.id}`;
        return (
          <div key={doc.id} className="document-table-row">
            <div className="document-name">
              <strong>{displayName}</strong>
              {doc.mimeType && <span className="muted">{doc.mimeType}</span>}
            </div>
            <div className="document-date">{formatDate(doc.uploadedAt)}</div>
            <div className="document-actions">
              <a
                className="btn-action"
                href={`${ASSET_URL}${doc.url}`}
                target="_blank"
                rel="noopener noreferrer"
                download={displayName || true}
              >
                Télécharger
              </a>
              {canDelete && (
                <button
                  type="button"
                  className="btn-action text-danger"
                  onClick={(event) => handleDelete(event, doc)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? 'Suppression...' : 'Supprimer'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentList;
