import { useEffect, useState } from 'react';
import { FolderKanban, Loader2, Plus } from 'lucide-react';
import { createAdminCategory, getAdminCategories, updateAdminCategory } from '@/api/adminApi';
import { categoryInitialState, normalizeAdminCategory } from '@/utils/adminMeta';
import '@/styles/dashboard.css';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState(categoryInitialState);

  useEffect(() => {
    let isMounted = true;

    getAdminCategories()
      .then((response) => {
        if (isMounted) setCategories(response.data.map(normalizeAdminCategory));
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    const payload = {
      active: categoryForm.isActive,
      description: categoryForm.description.trim(),
      isActive: categoryForm.isActive,
      name: categoryForm.name.trim(),
    };

    if (!payload.name) return;

    setSavingCategory(true);
    try {
      const response = categoryForm.id
        ? await updateAdminCategory(categoryForm.id, payload)
        : await createAdminCategory(payload);
      const savedCategory = normalizeAdminCategory(response.data);

      setCategories((currentCategories) => {
        if (categoryForm.id) {
          return currentCategories.map((entry) => (entry.id === savedCategory.id ? savedCategory : entry));
        }
        return [...currentCategories, savedCategory];
      });
      setCategoryForm(categoryInitialState);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      description: category.description || '',
      id: category.id,
      isActive: category.isActive,
      name: category.name || '',
    });
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <FolderKanban size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Categories
          </h1>
          <p className="dashboard-subtitle">Organisez les familles de services visibles dans le catalogue.</p>
        </div>

        <section className="admin-section">
          <form className="card admin-panel" onSubmit={handleCategorySubmit}>
            <div className="admin-panel-head">
              <div>
                <span className="admin-kicker">
                  <FolderKanban size={15} /> Categories
                </span>
                <h2>{categoryForm.id ? 'Modifier une categorie' : 'Ajouter une categorie'}</h2>
              </div>
              <span className="badge badge-primary">{categories.length}</span>
            </div>
            <div className="profile-form">
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input
                  className="form-input"
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Design graphique"
                />
              </div>
              <label className="wizard-check">
                <input
                  checked={categoryForm.isActive}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  type="checkbox"
                />
                Active
              </label>
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <Loader2 size={28} className="spinner" />
              </div>
            ) : (
              <div className="admin-category-list">
                {categories.map((category) => (
                  <button key={category.id} type="button" onClick={() => handleEditCategory(category)}>
                    <FolderKanban size={14} />
                    {category.name}
                    <span className={`badge ${category.isActive ? 'badge-success' : 'badge-warning'}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="admin-panel-actions">
              {categoryForm.id && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCategoryForm(categoryInitialState)}
                  type="button"
                >
                  Annuler
                </button>
              )}
              <button className="btn btn-primary btn-sm" disabled={savingCategory} type="submit">
                {savingCategory ? <Loader2 size={14} className="spinner" /> : <Plus size={14} />}
                {categoryForm.id ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
