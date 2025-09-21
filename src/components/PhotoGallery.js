import { useMemo, useState } from 'react';
import { ASSET_URL } from '../api/http';

const PhotoGallery = ({ photos = [], canDelete = false, onDelete }) => {
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
    [photos]
  );

  const handleDelete = async (event, photo) => {
    event.stopPropagation();
    if (!onDelete || deletingId) {
      return;
    }
    const confirmed = window.confirm('Supprimer cette photo ?');
    if (!confirmed) {
      return;
    }
    setDeletingId(photo.id);
    try {
      await onDelete(photo);
    } finally {
      setDeletingId(null);
    }
  };

  if (!sortedPhotos.length) {
    return <p>Aucune photo disponible.</p>;
  }

  return (
    <>
      <div className="photo-grid thumbnails">
        {sortedPhotos.map((photo) => (
          <figure key={photo.id} className="photo-card" onClick={() => setPreviewPhoto(photo)}>
            <div className="photo-thumb">
              <img
                src={`${ASSET_URL}${photo.url}`}
                alt={`Mission ${photo.missionId || photo.id} ${photo.phase || ''}`}
              />
              {canDelete && (
                <button
                  type="button"
                  className="photo-delete"
                  onClick={(event) => handleDelete(event, photo)}
                  disabled={deletingId === photo.id}
                >
                  {deletingId === photo.id ? 'Suppression...' : 'Supprimer'}
                </button>
              )}
            </div>
            <figcaption>
              <div className="photo-meta-main">{photo.label || 'Libelle non defini'}</div>
              <div className="photo-meta-sub">Phase : {photo.phase || 'Non definie'}</div>
              {photo.uploadedAt && (
                <div className="photo-meta-sub">Ajoute le {new Date(photo.uploadedAt).toLocaleString()}</div>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {previewPhoto && (
        <div className="photo-modal" role="dialog" aria-modal="true" onClick={() => setPreviewPhoto(null)}>
          <div className="photo-modal-content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="photo-modal-close" onClick={() => setPreviewPhoto(null)}>
              Fermer
            </button>
            <img
              src={`${ASSET_URL}${previewPhoto.url}`}
              alt={`Mission ${previewPhoto.missionId || previewPhoto.id}`}
            />
            <div className="photo-modal-meta">
              <h3>{previewPhoto.label || 'Libelle non defini'}</h3>
              <p>Phase : {previewPhoto.phase || 'Non definie'}</p>
              {previewPhoto.uploadedAt && <p>Ajoute le {new Date(previewPhoto.uploadedAt).toLocaleString()}</p>}
            </div>
            {canDelete && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(event) => handleDelete(event, previewPhoto)}
                disabled={deletingId === previewPhoto.id}
              >
                {deletingId === previewPhoto.id ? 'Suppression...' : 'Supprimer'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;
